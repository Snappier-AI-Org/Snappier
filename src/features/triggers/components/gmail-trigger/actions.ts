"use server";

import { auth } from "@/lib/auth";
import prisma from "@/lib/db";
import { decrypt, encrypt } from "@/lib/encryption";
import { google } from "googleapis";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { getSubscriptionToken, type Realtime } from "@inngest/realtime";
import { gmailTriggerChannel } from "@/inngest/channels/gmail-trigger";
import { inngest } from "@/inngest/client";

export type GmailTriggerToken = Realtime.Token<
  typeof gmailTriggerChannel,
  ["status"]
>;

type OAuthTokenData = {
  accessToken: string;
  refreshToken?: string;
  tokenExpiry?: number;
  email?: string;
  tokenType: "oauth";
};

async function refreshAccessToken(refreshToken: string): Promise<{
  accessToken: string;
  expiryDate: number;
}> {
  const clientId = process.env.GMAIL_CLIENT_ID;
  const clientSecret = process.env.GMAIL_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error("Gmail credentials not configured");
  }

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });

  if (!response.ok) {
    const errorData = await response.text();
    console.error("Failed to refresh Gmail token:", errorData);
    throw new Error("Failed to refresh access token");
  }

  const tokens = await response.json();

  if (!tokens.access_token) {
    throw new Error("Failed to refresh access token");
  }

  return {
    accessToken: tokens.access_token,
    expiryDate: Date.now() + tokens.expires_in * 1000,
  };
}

async function getGmailClientWithTokenUpdate(credentialId: string, userId: string) {
  const credential = await prisma.credential.findFirst({
    where: { id: credentialId, userId },
  });

  if (!credential) {
    throw new Error("Gmail credential not found");
  }

  const decryptedValue = decrypt(credential.value);
  let tokenData: OAuthTokenData;

  try {
    tokenData = JSON.parse(decryptedValue);
  } catch {
    throw new Error("Invalid credential format");
  }

  if (tokenData.tokenType !== "oauth") {
    throw new Error("Invalid Gmail credential type");
  }

  let accessToken = tokenData.accessToken;

  // Check if token is expired or about to expire (within 5 minutes)
  const isExpired = tokenData.tokenExpiry
    ? tokenData.tokenExpiry < Date.now() + 5 * 60 * 1000
    : false;

  if (isExpired && tokenData.refreshToken) {
    console.log(`[Gmail Trigger] Token expired, refreshing...`);

    try {
      const refreshed = await refreshAccessToken(tokenData.refreshToken);
      accessToken = refreshed.accessToken;

      // Update stored credential with new access token
      const updatedTokenData: OAuthTokenData = {
        ...tokenData,
        accessToken: refreshed.accessToken,
        tokenExpiry: refreshed.expiryDate,
      };

      await prisma.credential.update({
        where: { id: credentialId },
        data: { value: encrypt(JSON.stringify(updatedTokenData)) },
      });

      console.log(`[Gmail Trigger] Token refreshed successfully`);
    } catch (refreshError) {
      console.error(`[Gmail Trigger] Failed to refresh token:`, refreshError);
      throw new Error("Failed to refresh Gmail access token");
    }
  }

  const oauth2Client = new google.auth.OAuth2(
    process.env.GMAIL_CLIENT_ID,
    process.env.GMAIL_CLIENT_SECRET,
    process.env.GMAIL_REDIRECT_URL
  );

  oauth2Client.setCredentials({
    access_token: accessToken,
    refresh_token: tokenData.refreshToken,
  });

  return google.gmail({ version: "v1", auth: oauth2Client });
}

export async function startGmailWatch(
  workflowId: string,
  credentialId: string,
  labelIds: string[] = ["INBOX"]
): Promise<{ success: boolean; error?: string; watchId?: string }> {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user?.id) {
      return { success: false, error: "Not authenticated" };
    }

    const userId = session.user.id;

    // Get the Gmail client
    const gmail = await getGmailClientWithTokenUpdate(credentialId, userId);

    // Get the current profile to verify the email
    const profileResponse = await gmail.users.getProfile({ userId: "me" });
    const email = profileResponse.data.emailAddress;

    // Get the current historyId
    const currentHistoryId = profileResponse.data.historyId;

    if (!currentHistoryId) {
      return { success: false, error: "Could not get history ID" };
    }

    // The Pub/Sub topic must be created in Google Cloud Console
    // Format: projects/{project-id}/topics/{topic-name}
    const pubsubTopic = process.env.GMAIL_PUBSUB_TOPIC;

    if (!pubsubTopic) {
      return {
        success: false,
        error: "GMAIL_PUBSUB_TOPIC environment variable not configured",
      };
    }

    // Start the Gmail watch
    const watchResponse = await gmail.users.watch({
      userId: "me",
      requestBody: {
        topicName: pubsubTopic,
        labelIds: labelIds,
        labelFilterBehavior: "include",
      },
    });

    if (!watchResponse.data.expiration) {
      return { success: false, error: "Watch creation failed" };
    }

    const expiration = new Date(parseInt(watchResponse.data.expiration));

    // Store the watch in the database (upsert to handle re-enabling)
    const watch = await prisma.gmailWatch.upsert({
      where: {
        workflowId_credentialId: {
          workflowId,
          credentialId,
        },
      },
      update: {
        historyId: currentHistoryId,
        expiration,
        labelIds,
        updatedAt: new Date(),
      },
      create: {
        userId,
        workflowId,
        credentialId,
        historyId: currentHistoryId,
        expiration,
        labelIds,
      },
    });

    console.log(`[Gmail Trigger] Watch created for workflow ${workflowId}:`, {
      watchId: watch.id,
      email,
      expiration,
      labelIds,
    });

    revalidatePath(`/workflows/${workflowId}`);

    return { success: true, watchId: watch.id };
  } catch (error) {
    console.error("[Gmail Trigger] Error starting watch:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to start watch",
    };
  }
}

export async function stopGmailWatch(
  workflowId: string,
  credentialId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user?.id) {
      return { success: false, error: "Not authenticated" };
    }

    const userId = session.user.id;

    // Find the watch
    const watch = await prisma.gmailWatch.findFirst({
      where: {
        workflowId,
        credentialId,
        userId,
      },
    });

    if (!watch) {
      return { success: false, error: "Watch not found" };
    }

    // Get the Gmail client
    const gmail = await getGmailClientWithTokenUpdate(credentialId, userId);

    // Stop the watch
    await gmail.users.stop({ userId: "me" });

    // Delete from database
    await prisma.gmailWatch.delete({
      where: { id: watch.id },
    });

    console.log(`[Gmail Trigger] Watch stopped for workflow ${workflowId}`);

    revalidatePath(`/workflows/${workflowId}`);

    return { success: true };
  } catch (error) {
    console.error("[Gmail Trigger] Error stopping watch:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to stop watch",
    };
  }
}

export async function getGmailWatchStatus(
  workflowId: string,
  credentialId: string
): Promise<{
  active: boolean;
  expiration?: Date;
  labelIds?: string[];
}> {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user?.id) {
      return { active: false };
    }

    const watch = await prisma.gmailWatch.findFirst({
      where: {
        workflowId,
        credentialId,
        userId: session.user.id,
        expiration: { gt: new Date() },
      },
    });

    if (!watch) {
      return { active: false };
    }

    return {
      active: true,
      expiration: watch.expiration,
      labelIds: watch.labelIds,
    };
  } catch (error) {
    console.error("[Gmail Trigger] Error getting watch status:", error);
    return { active: false };
  }
}

export async function fetchGmailTriggerRealtimeToken(): Promise<GmailTriggerToken> {
  const token = await getSubscriptionToken(inngest, {
    channel: gmailTriggerChannel(),
    topics: ["status"],
  });

  return token;
}
