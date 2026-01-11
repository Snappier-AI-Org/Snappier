import type { NodeExecutor } from "@/features/executions/types";
import { NonRetriableError } from "inngest";
import { gmailChannel } from "@/inngest/channels/gmail";
import { parseError } from "@/features/executions/lib/error-parser";
import prisma from "@/lib/db";
import { decrypt, encrypt } from "@/lib/encryption";
import { google } from "googleapis";
import { processTemplate } from "@/features/executions/lib/handlebars-utils";

type GmailData = {
  variableName?: string;
  credentialId?: string;
  operation?: "list" | "read" | "send" | "reply" | "forward" | "draft" | "search" | "delete" | "label";
  to?: string;
  cc?: string;
  bcc?: string;
  subject?: string;
  body?: string;
  isHtml?: boolean;
  messageId?: string;
  threadId?: string;
  labelIds?: string[];
  query?: string;
  maxResults?: string;
  draftId?: string;
};

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
  const oauth2Client = new google.auth.OAuth2(
    process.env.GMAIL_CLIENT_ID,
    process.env.GMAIL_CLIENT_SECRET,
    process.env.GMAIL_REDIRECT_URL
  );

  oauth2Client.setCredentials({ refresh_token: refreshToken });

  const { credentials } = await oauth2Client.refreshAccessToken();

  if (!credentials.access_token) {
    throw new Error("Failed to refresh access token");
  }

  return {
    accessToken: credentials.access_token,
    expiryDate: credentials.expiry_date || Date.now() + 3600 * 1000,
  };
}

async function getGmailClient(credentialId: string, userId: string) {
  const credential = await prisma.credential.findFirst({
    where: { id: credentialId, userId },
  });

  if (!credential) {
    throw new NonRetriableError("Gmail credential not found");
  }

  const decryptedValue = decrypt(credential.value);
  let tokenData: OAuthTokenData;

  try {
    tokenData = JSON.parse(decryptedValue);
  } catch {
    throw new NonRetriableError("Invalid credential format. Please reconnect your Gmail account.");
  }

  // Check if this is an OAuth token
  if (tokenData.tokenType === "oauth") {
    let accessToken = tokenData.accessToken;

    // Check if token is expired or about to expire (within 5 minutes)
    const isExpired = tokenData.tokenExpiry 
      ? tokenData.tokenExpiry < Date.now() + 5 * 60 * 1000
      : false;

    if (isExpired && tokenData.refreshToken) {
      console.log(`[Gmail] Token expired, refreshing...`);
      
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

        console.log(`[Gmail] Token refreshed successfully`);
      } catch (refreshError) {
        console.error(`[Gmail] Failed to refresh token:`, refreshError);
        throw new NonRetriableError(
          "Failed to refresh Gmail access token. Please reconnect your account."
        );
      }
    }

    // Create OAuth2 client with access token
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

  throw new NonRetriableError("Invalid Gmail credential type. Please reconnect your account.");
}

// Helper function to encode email for Gmail API
function createEmail(to: string, subject: string, body: string, options: {
  cc?: string;
  bcc?: string;
  isHtml?: boolean;
  inReplyTo?: string;
  references?: string;
  from?: string;
} = {}): string {
  const mimeType = options.isHtml ? "text/html" : "text/plain";
  
  // Build headers array, filtering out empty optional headers
  const headers: string[] = [];
  
  if (options.from) headers.push(`From: ${options.from}`);
  headers.push(`To: ${to}`);
  if (options.cc) headers.push(`Cc: ${options.cc}`);
  if (options.bcc) headers.push(`Bcc: ${options.bcc}`);
  headers.push(`Subject: ${subject}`);
  if (options.inReplyTo) headers.push(`In-Reply-To: ${options.inReplyTo}`);
  if (options.references) headers.push(`References: ${options.references}`);
  headers.push(`Content-Type: ${mimeType}; charset=utf-8`);
  headers.push("MIME-Version: 1.0");
  
  // Join headers, add blank line, then body
  // The blank line separates headers from body in MIME format
  const email = headers.join("\r\n") + "\r\n\r\n" + (body || "");

  console.log(`[Gmail] Creating email with body length: ${body?.length || 0}, body preview: ${body?.substring(0, 100)}`);

  return Buffer.from(email).toString("base64url");
}

// Helper to decode message parts
function getMessageBody(payload: {
  mimeType?: string | null;
  body?: { data?: string | null } | null;
  parts?: Array<{
    mimeType?: string | null;
    body?: { data?: string | null } | null;
    parts?: Array<{
      mimeType?: string | null;
      body?: { data?: string | null } | null;
    }>;
  }>;
} | undefined): { text: string; html: string } {
  let text = "";
  let html = "";

  if (!payload) return { text, html };

  const processPayload = (p: typeof payload) => {
    if (!p) return;
    
    if (p.mimeType === "text/plain" && p.body?.data) {
      text = Buffer.from(p.body.data, "base64url").toString("utf-8");
    } else if (p.mimeType === "text/html" && p.body?.data) {
      html = Buffer.from(p.body.data, "base64url").toString("utf-8");
    } else if (p.parts) {
      for (const part of p.parts) {
        processPayload(part as typeof payload);
      }
    }
  };

  processPayload(payload);
  return { text, html };
}

// Helper to extract headers
function getHeader(headers: Array<{ name?: string | null; value?: string | null }> | undefined, name: string): string {
  return headers?.find(h => h.name?.toLowerCase() === name.toLowerCase())?.value || "";
}

export const gmailExecutor: NodeExecutor<GmailData> = async ({
  data,
  nodeId,
  context,
  userId,
  step,
  publish,
}) => {
  console.log(`[Gmail Node ${nodeId}] Starting execution`, {
    nodeId,
    hasCredentialId: !!data.credentialId,
    operation: data.operation,
  });

  await publish(
    gmailChannel().status({
      nodeId,
      status: "loading",
    })
  );

  // Validate required fields
  if (!data.variableName) {
    const errorMsg = "Variable name is missing";
    console.error(`[Gmail Node ${nodeId}] Error: ${errorMsg}`);
    const parsedError = parseError(new Error(errorMsg));
    await publish(
      gmailChannel().status({
        nodeId,
        status: "error",
      })
    );
    throw new NonRetriableError(
      `${parsedError.message}. ${parsedError.guidance}`
    );
  }

  const variableName = data.variableName;

  if (!data.credentialId) {
    const errorMsg = "Credential is required";
    console.error(`[Gmail Node ${nodeId}] Error: ${errorMsg}`);
    const parsedError = parseError(new Error(errorMsg));
    await publish(
      gmailChannel().status({
        nodeId,
        status: "error",
      })
    );
    throw new NonRetriableError(
      `${parsedError.message}. ${parsedError.guidance}`
    );
  }

  if (!data.operation) {
    const errorMsg = "Operation is required";
    console.error(`[Gmail Node ${nodeId}] Error: ${errorMsg}`);
    const parsedError = parseError(new Error(errorMsg));
    await publish(
      gmailChannel().status({
        nodeId,
        status: "error",
      })
    );
    throw new NonRetriableError(
      `${parsedError.message}. ${parsedError.guidance}`
    );
  }

  try {
    const result = await step.run(`gmail-${data.operation}`, async () => {
      const gmail = await getGmailClient(data.credentialId!, userId);

      switch (data.operation) {
        case "list": {
          const query = data.query 
            ? processTemplate(data.query, context)
            : undefined;

          const maxResults = data.maxResults ? parseInt(data.maxResults, 10) : 10;

          const response = await gmail.users.messages.list({
            userId: "me",
            q: query,
            maxResults,
          });

          // Fetch full message details for each message
          const messages = await Promise.all(
            (response.data.messages || []).map(async (msg) => {
              const full = await gmail.users.messages.get({
                userId: "me",
                id: msg.id!,
                format: "metadata",
                metadataHeaders: ["From", "To", "Subject", "Date"],
              });
              
              return {
                id: full.data.id,
                threadId: full.data.threadId,
                snippet: full.data.snippet,
                from: getHeader(full.data.payload?.headers, "From"),
                to: getHeader(full.data.payload?.headers, "To"),
                subject: getHeader(full.data.payload?.headers, "Subject"),
                date: getHeader(full.data.payload?.headers, "Date"),
                labelIds: full.data.labelIds,
              };
            })
          );

          console.log(`[Gmail Node ${nodeId}] Listed ${messages.length} messages`);

          return {
            ...context,
            [variableName]: {
              messages,
              count: messages.length,
              resultSizeEstimate: response.data.resultSizeEstimate,
            },
          };
        }

        case "read": {
          if (!data.messageId) {
            throw new NonRetriableError("Message ID is required for reading");
          }

          const messageId = processTemplate(data.messageId, context);

          const response = await gmail.users.messages.get({
            userId: "me",
            id: messageId,
            format: "full",
          });

          const body = getMessageBody(response.data.payload);

          const message = {
            id: response.data.id,
            threadId: response.data.threadId,
            snippet: response.data.snippet,
            from: getHeader(response.data.payload?.headers, "From"),
            to: getHeader(response.data.payload?.headers, "To"),
            cc: getHeader(response.data.payload?.headers, "Cc"),
            subject: getHeader(response.data.payload?.headers, "Subject"),
            date: getHeader(response.data.payload?.headers, "Date"),
            messageId: getHeader(response.data.payload?.headers, "Message-ID"),
            labelIds: response.data.labelIds,
            body: body.text || body.html,
            bodyHtml: body.html,
            bodyText: body.text,
          };

          console.log(`[Gmail Node ${nodeId}] Read message: ${message.subject}`);

          return {
            ...context,
            [variableName]: {
              message,
            },
          };
        }

        case "send": {
          if (!data.to) {
            throw new NonRetriableError("Recipient (To) is required for sending");
          }

          const to = processTemplate(data.to, context);
          const subject = data.subject ? processTemplate(data.subject, context) : "";
          const body = data.body ? processTemplate(data.body, context) : "";
          const cc = data.cc ? processTemplate(data.cc, context) : undefined;
          const bcc = data.bcc ? processTemplate(data.bcc, context) : undefined;

          console.log(`[Gmail Node ${nodeId}] Send operation - data.body: "${data.body}", compiled body: "${body}"`);

          const raw = createEmail(to, subject, body, { cc, bcc, isHtml: data.isHtml });

          const response = await gmail.users.messages.send({
            userId: "me",
            requestBody: {
              raw,
            },
          });

          console.log(`[Gmail Node ${nodeId}] Sent message to: ${to}`);

          return {
            ...context,
            [variableName]: {
              sent: {
                id: response.data.id,
                threadId: response.data.threadId,
                to,
                subject,
              },
            },
          };
        }

        case "reply": {
          if (!data.messageId || !data.threadId) {
            throw new NonRetriableError("Message ID and Thread ID are required for reply");
          }

          const messageId = processTemplate(data.messageId, context);
          const threadId = processTemplate(data.threadId, context);

          // Get original message to get headers
          const original = await gmail.users.messages.get({
            userId: "me",
            id: messageId,
            format: "metadata",
            metadataHeaders: ["From", "Subject", "Message-ID"],
          });

          const originalFrom = getHeader(original.data.payload?.headers, "From");
          const originalSubject = getHeader(original.data.payload?.headers, "Subject");
          const originalMessageId = getHeader(original.data.payload?.headers, "Message-ID");

          const to = data.to ? processTemplate(data.to, context) : originalFrom;
          const subject = originalSubject.startsWith("Re:") ? originalSubject : `Re: ${originalSubject}`;
          const body = data.body ? processTemplate(data.body, context) : "";

          const raw = createEmail(to, subject, body, {
            isHtml: data.isHtml,
            inReplyTo: originalMessageId,
            references: originalMessageId,
          });

          const response = await gmail.users.messages.send({
            userId: "me",
            requestBody: {
              raw,
              threadId,
            },
          });

          console.log(`[Gmail Node ${nodeId}] Replied to message: ${messageId}`);

          return {
            ...context,
            [variableName]: {
              reply: {
                id: response.data.id,
                threadId: response.data.threadId,
                to,
                subject,
              },
            },
          };
        }

        case "draft": {
          const to = data.to ? processTemplate(data.to, context) : "";
          const subject = data.subject ? processTemplate(data.subject, context) : "";
          const body = data.body ? processTemplate(data.body, context) : "";
          const cc = data.cc ? processTemplate(data.cc, context) : undefined;
          const bcc = data.bcc ? processTemplate(data.bcc, context) : undefined;

          const raw = createEmail(to, subject, body, { cc, bcc, isHtml: data.isHtml });

          const response = await gmail.users.drafts.create({
            userId: "me",
            requestBody: {
              message: {
                raw,
              },
            },
          });

          console.log(`[Gmail Node ${nodeId}] Created draft`);

          return {
            ...context,
            [variableName]: {
              draft: {
                id: response.data.id,
                to,
                subject,
              },
            },
          };
        }

        case "search": {
          if (!data.query) {
            throw new NonRetriableError("Search query is required");
          }

          const query = processTemplate(data.query, context);
          const maxResultsSearch = data.maxResults ? parseInt(data.maxResults, 10) : 25;

          const response = await gmail.users.messages.list({
            userId: "me",
            q: query,
            maxResults: maxResultsSearch,
          });

          // Fetch full message details for each message
          const messages = await Promise.all(
            (response.data.messages || []).map(async (msg) => {
              const full = await gmail.users.messages.get({
                userId: "me",
                id: msg.id!,
                format: "metadata",
                metadataHeaders: ["From", "To", "Subject", "Date"],
              });
              
              return {
                id: full.data.id,
                threadId: full.data.threadId,
                snippet: full.data.snippet,
                from: getHeader(full.data.payload?.headers, "From"),
                to: getHeader(full.data.payload?.headers, "To"),
                subject: getHeader(full.data.payload?.headers, "Subject"),
                date: getHeader(full.data.payload?.headers, "Date"),
                labelIds: full.data.labelIds,
              };
            })
          );

          console.log(`[Gmail Node ${nodeId}] Search returned ${messages.length} messages`);

          return {
            ...context,
            [variableName]: {
              messages,
              count: messages.length,
              query,
            },
          };
        }

        case "delete": {
          if (!data.messageId) {
            throw new NonRetriableError("Message ID is required for deletion");
          }

          const messageId = processTemplate(data.messageId, context);

          await gmail.users.messages.trash({
            userId: "me",
            id: messageId,
          });

          console.log(`[Gmail Node ${nodeId}] Deleted (trashed) message: ${messageId}`);

          return {
            ...context,
            [variableName]: {
              deleted: {
                id: messageId,
                success: true,
              },
            },
          };
        }

        case "label": {
          if (!data.messageId) {
            throw new NonRetriableError("Message ID is required for labeling");
          }

          const messageId = processTemplate(data.messageId, context);
          const labelIds = data.labelIds || [];

          const response = await gmail.users.messages.modify({
            userId: "me",
            id: messageId,
            requestBody: {
              addLabelIds: labelIds,
            },
          });

          console.log(`[Gmail Node ${nodeId}] Added labels to message: ${messageId}`);

          return {
            ...context,
            [variableName]: {
              labeled: {
                id: response.data.id,
                labelIds: response.data.labelIds,
              },
            },
          };
        }

        default:
          throw new NonRetriableError(`Unsupported operation: ${data.operation}`);
      }
    });

    await publish(
      gmailChannel().status({
        nodeId,
        status: "success",
      })
    );

    return result;
  } catch (error) {
    console.error(`[Gmail Node ${nodeId}] Execution error:`, error);
    
    const parsedError = parseError(error as Error);
    
    await publish(
      gmailChannel().status({
        nodeId,
        status: "error",
      })
    );

    throw new NonRetriableError(
      `${parsedError.message}. ${parsedError.guidance}`
    );
  }
};
