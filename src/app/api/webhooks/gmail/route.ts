import { sendWorkflowExecution } from "@/inngest/utils";
import { type NextRequest, NextResponse } from "next/server";
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

type PubSubMessage = {
  message: {
    data: string; // Base64 encoded JSON
    messageId: string;
    publishTime: string;
  };
  subscription: string;
};

type GmailPushNotification = {
  emailAddress: string;
  historyId: string;
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

async function getGmailClient(credentialId: string, userId: string) {
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
    console.log(`[Gmail Webhook] Token expired, refreshing...`);

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

      console.log(`[Gmail Webhook] Token refreshed successfully`);
    } catch (refreshError) {
      console.error(`[Gmail Webhook] Failed to refresh token:`, refreshError);
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

function getHeader(
  headers: Array<{ name?: string | null; value?: string | null }> | undefined,
  name: string
): string {
  if (!headers) return "";
  const header = headers.find(
    (h) => h.name?.toLowerCase() === name.toLowerCase()
  );
  return header?.value || "";
}

function getMessageBody(
  payload:
    | {
        mimeType?: string | null;
        body?: { data?: string | null } | null;
        parts?: Array<{
          mimeType?: string | null;
          body?: { data?: string | null } | null;
        }>;
      }
    | undefined
): { text: string; html: string } {
  if (!payload) return { text: "", html: "" };

  let text = "";
  let html = "";

  // Simple single-part message
  if (payload.body?.data) {
    const decoded = Buffer.from(payload.body.data, "base64url").toString(
      "utf-8"
    );
    if (payload.mimeType === "text/html") {
      html = decoded;
    } else {
      text = decoded;
    }
  }

  // Multi-part message
  if (payload.parts) {
    for (const part of payload.parts) {
      if (part.body?.data) {
        const decoded = Buffer.from(part.body.data, "base64url").toString(
          "utf-8"
        );
        if (part.mimeType === "text/html") {
          html = decoded;
        } else if (part.mimeType === "text/plain") {
          text = decoded;
        }
      }
    }
  }

  return { text, html };
}

export async function POST(request: NextRequest) {
  try {
    // Parse the Pub/Sub message
    const body = (await request.json()) as PubSubMessage;

    if (!body.message?.data) {
      console.error("[Gmail Webhook] Missing message data");
      return NextResponse.json({ error: "Missing message data" }, { status: 400 });
    }

    // Decode the base64 message
    const decodedData = Buffer.from(body.message.data, "base64").toString("utf-8");
    const notification: GmailPushNotification = JSON.parse(decodedData);

    console.log("[Gmail Webhook] Received notification:", {
      emailAddress: notification.emailAddress,
      historyId: notification.historyId,
      messageId: body.message.messageId,
    });

    // Find all GmailWatch subscriptions for this email address
    // We need to look up the credential by email address
    const credentials = await prisma.credential.findMany({
      where: {
        type: "GMAIL",
      },
    });

    // Find credentials that match the email address
    const matchingCredentialIds: string[] = [];
    for (const credential of credentials) {
      try {
        const decryptedValue = decrypt(credential.value);
        const tokenData: OAuthTokenData = JSON.parse(decryptedValue);
        if (tokenData.email === notification.emailAddress) {
          matchingCredentialIds.push(credential.id);
        }
      } catch {
        // Skip invalid credentials
      }
    }

    if (matchingCredentialIds.length === 0) {
      console.log(
        "[Gmail Webhook] No matching credentials found for:",
        notification.emailAddress
      );
      // Still return 200 to acknowledge the message
      return NextResponse.json({ success: true, message: "No matching credentials" });
    }

    // Find all watches for these credentials
    const watches = await prisma.gmailWatch.findMany({
      where: {
        credentialId: { in: matchingCredentialIds },
        expiration: { gt: new Date() }, // Only active watches
      },
    });

    if (watches.length === 0) {
      console.log(
        "[Gmail Webhook] No active watches found for credentials"
      );
      return NextResponse.json({ success: true, message: "No active watches" });
    }

    console.log(`[Gmail Webhook] Found ${watches.length} active watches`);

    // For each watch, fetch the new emails and trigger the workflow
    for (const watch of watches) {
      try {
        // Find the Gmail trigger node in this workflow
        const gmailTriggerNode = await prisma.node.findFirst({
          where: {
            workflowId: watch.workflowId,
            type: "GMAIL_TRIGGER",
          },
          select: { id: true },
        });
        
        // Get the Gmail client for this credential
        const gmail = await getGmailClient(watch.credentialId, watch.userId);

        // Get the history since the last known historyId
        const historyResponse = await gmail.users.history.list({
          userId: "me",
          startHistoryId: watch.historyId,
          historyTypes: ["messageAdded"],
          labelId: watch.labelIds[0] || "INBOX",
        });

        const history = historyResponse.data.history || [];

        // Collect all new message IDs
        const newMessageIds = new Set<string>();
        for (const record of history) {
          if (record.messagesAdded) {
            for (const added of record.messagesAdded) {
              if (added.message?.id) {
                newMessageIds.add(added.message.id);
              }
            }
          }
        }

        if (newMessageIds.size === 0) {
          console.log(
            `[Gmail Webhook] No new messages for watch ${watch.id}`
          );
          continue;
        }

        console.log(
          `[Gmail Webhook] Found ${newMessageIds.size} new messages for watch ${watch.id}`
        );

        // Fetch full message details for each new message
        for (const messageId of newMessageIds) {
          try {
            const messageResponse = await gmail.users.messages.get({
              userId: "me",
              id: messageId,
              format: "full",
            });

            const message = messageResponse.data;
            const body = getMessageBody(message.payload);

            const emailData = {
              id: message.id,
              threadId: message.threadId,
              snippet: message.snippet,
              from: getHeader(message.payload?.headers, "From"),
              to: getHeader(message.payload?.headers, "To"),
              cc: getHeader(message.payload?.headers, "Cc"),
              subject: getHeader(message.payload?.headers, "Subject"),
              date: getHeader(message.payload?.headers, "Date"),
              messageId: getHeader(message.payload?.headers, "Message-ID"),
              labelIds: message.labelIds,
              body: body.text || body.html,
              bodyHtml: body.html,
              bodyText: body.text,
            };

            console.log(
              `[Gmail Webhook] Triggering workflow ${watch.workflowId} for message: ${emailData.subject}`
            );

            // Trigger the workflow execution
            await sendWorkflowExecution({
              workflowId: watch.workflowId,
              initialData: {
                gmailTrigger: {
                  nodeId: gmailTriggerNode?.id, // Include nodeId so we can identify the active trigger
                  email: emailData,
                  timestamp: new Date().toISOString(),
                  historyId: notification.historyId,
                },
              },
            });
          } catch (messageError) {
            console.error(
              `[Gmail Webhook] Error processing message ${messageId}:`,
              messageError
            );
          }
        }

        // Update the historyId for this watch
        if (historyResponse.data.historyId) {
          await prisma.gmailWatch.update({
            where: { id: watch.id },
            data: { historyId: historyResponse.data.historyId },
          });
        }
      } catch (watchError) {
        console.error(
          `[Gmail Webhook] Error processing watch ${watch.id}:`,
          watchError
        );
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[Gmail Webhook] Error:", error);
    // Still return 200 to prevent Pub/Sub retries for parsing errors
    return NextResponse.json(
      { success: false, error: "Internal error" },
      { status: 200 }
    );
  }
}

// Google Pub/Sub also sends a verification GET request when setting up the subscription
export async function GET(request: NextRequest) {
  // Return 200 for verification
  return NextResponse.json({ status: "ok" });
}
