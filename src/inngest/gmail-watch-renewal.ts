import { inngest } from "./client";
import prisma from "@/lib/db";
import { decrypt, encrypt } from "@/lib/encryption";
import { google } from "googleapis";

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
    console.log(`[Gmail Watch Renewal] Token expired, refreshing...`);

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

      console.log(`[Gmail Watch Renewal] Token refreshed successfully`);
    } catch (refreshError) {
      console.error(`[Gmail Watch Renewal] Failed to refresh token:`, refreshError);
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

// Inngest function to renew expiring watches
// Gmail watch subscriptions expire after 7 days max
export const renewGmailWatches = inngest.createFunction(
  { id: "renew-gmail-watches" },
  { cron: "0 */6 * * *" }, // Run every 6 hours
  async ({ step }) => {
    // Find watches expiring in the next 24 hours
    const expiringWatches = await step.run("find-expiring-watches", async () => {
      const cutoff = new Date(Date.now() + 24 * 60 * 60 * 1000);
      return prisma.gmailWatch.findMany({
        where: {
          expiration: { lt: cutoff },
        },
      });
    });

    console.log(`[Gmail Watch Renewal] Found ${expiringWatches.length} expiring watches`);

    for (const watch of expiringWatches) {
      await step.run(`renew-watch-${watch.id}`, async () => {
        try {
          const gmail = await getGmailClientWithTokenUpdate(
            watch.credentialId,
            watch.userId
          );

          const pubsubTopic = process.env.GMAIL_PUBSUB_TOPIC;
          if (!pubsubTopic) {
            console.error("[Gmail Watch Renewal] GMAIL_PUBSUB_TOPIC not configured");
            return;
          }

          // Renew the watch
          const watchResponse = await gmail.users.watch({
            userId: "me",
            requestBody: {
              topicName: pubsubTopic,
              labelIds: watch.labelIds,
              labelFilterBehavior: "include",
            },
          });

          if (watchResponse.data.expiration) {
            const newExpiration = new Date(
              parseInt(watchResponse.data.expiration)
            );

            await prisma.gmailWatch.update({
              where: { id: watch.id },
              data: {
                expiration: newExpiration,
                historyId: watchResponse.data.historyId || watch.historyId,
              },
            });

            console.log(`[Gmail Watch Renewal] Renewed watch ${watch.id}, new expiration:`, newExpiration);
          }
        } catch (error) {
          console.error(`[Gmail Watch Renewal] Failed to renew watch ${watch.id}:`, error);
          // Optionally delete the watch if it can't be renewed
        }
      });
    }

    return { renewed: expiringWatches.length };
  }
);
