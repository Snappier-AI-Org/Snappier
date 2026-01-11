import type { NodeExecutor } from "@/features/executions/types";
import { NonRetriableError } from "inngest";
import { outlookChannel } from "@/inngest/channels/outlook";
import { parseError } from "@/features/executions/lib/error-parser";
import prisma from "@/lib/db";
import { decrypt, encrypt } from "@/lib/encryption";
import { processTemplate } from "@/features/executions/lib/handlebars-utils";

type OutlookData = {
  variableName?: string;
  credentialId?: string;
  operation?: "send_email" | "read_emails" | "search_emails" | "get_email" | "delete_email" | "reply_email" | "forward_email" | "mark_as_read";
  to?: string;
  cc?: string;
  bcc?: string;
  subject?: string;
  body?: string;
  isHtml?: boolean;
  messageId?: string;
  query?: string;
  maxResults?: string;
  forwardTo?: string;
  markAsRead?: boolean;
  attachments?: string;
};

type OAuthTokenData = {
  accessToken: string;
  refreshToken?: string;
  tokenExpiry?: number;
  email?: string;
  tokenType: "oauth";
};

const TOKEN_URL = "https://login.microsoftonline.com/common/oauth2/v2.0/token";
const GRAPH_API_URL = "https://graph.microsoft.com/v1.0";

async function refreshAccessToken(refreshToken: string): Promise<{
  accessToken: string;
  expiryDate: number;
}> {
  const clientId = process.env.OUTLOOK_CLIENT_ID;
  const clientSecret = process.env.OUTLOOK_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error("Outlook credentials not configured");
  }

  const response = await fetch(TOKEN_URL, {
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
    console.error("Failed to refresh Outlook token:", errorData);
    throw new Error("Failed to refresh access token");
  }

  const tokens = await response.json();

  if (!tokens.access_token) {
    throw new Error("Failed to refresh access token");
  }

  return {
    accessToken: tokens.access_token,
    expiryDate: Date.now() + (tokens.expires_in * 1000),
  };
}

async function getOutlookClient(credentialId: string, userId: string): Promise<string> {
  const credential = await prisma.credential.findFirst({
    where: { id: credentialId, userId },
  });

  if (!credential) {
    throw new NonRetriableError("Outlook credential not found");
  }

  const decryptedValue = decrypt(credential.value);
  let tokenData: OAuthTokenData;

  try {
    tokenData = JSON.parse(decryptedValue);
  } catch {
    throw new NonRetriableError("Invalid credential format. Please reconnect your Outlook account.");
  }

  // Check if this is an OAuth token
  if (tokenData.tokenType === "oauth") {
    let accessToken = tokenData.accessToken;

    // Check if token is expired or about to expire (within 5 minutes)
    const isExpired = tokenData.tokenExpiry 
      ? tokenData.tokenExpiry < Date.now() + 5 * 60 * 1000
      : false;

    if (isExpired && tokenData.refreshToken) {
      console.log(`[Outlook] Token expired, refreshing...`);
      
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

        console.log(`[Outlook] Token refreshed successfully`);
      } catch (refreshError) {
        console.error(`[Outlook] Failed to refresh token:`, refreshError);
        throw new NonRetriableError(
          "Failed to refresh Outlook access token. Please reconnect your account."
        );
      }
    }

    return accessToken;
  }

  throw new NonRetriableError("Invalid Outlook credential type. Please reconnect your account.");
}

// Helper function to create email body for Microsoft Graph API
function createEmailBody(to: string, subject: string, body: string, options: {
  cc?: string;
  bcc?: string;
  isHtml?: boolean;
  attachments?: Array<{ name: string; contentBytes: string; contentType: string }>;
} = {}): object {
  const message: Record<string, unknown> = {
    subject,
    body: {
      contentType: options.isHtml ? "HTML" : "Text",
      content: body,
    },
    toRecipients: to.split(",").map(email => ({
      emailAddress: { address: email.trim() },
    })),
  };

  if (options.cc) {
    message.ccRecipients = options.cc.split(",").map(email => ({
      emailAddress: { address: email.trim() },
    }));
  }

  if (options.bcc) {
    message.bccRecipients = options.bcc.split(",").map(email => ({
      emailAddress: { address: email.trim() },
    }));
  }

  if (options.attachments && options.attachments.length > 0) {
    message.attachments = options.attachments.map(att => ({
      "@odata.type": "#microsoft.graph.fileAttachment",
      name: att.name,
      contentBytes: att.contentBytes,
      contentType: att.contentType,
    }));
  }

  return message;
}

// Helper to parse email response
function parseEmailResponse(email: Record<string, unknown>): object {
  return {
    id: email.id,
    conversationId: email.conversationId,
    subject: email.subject,
    from: (email.from as Record<string, Record<string, string>>)?.emailAddress?.address || "",
    to: ((email.toRecipients as Array<Record<string, Record<string, string>>>) || [])
      .map(r => r.emailAddress?.address)
      .filter(Boolean)
      .join(", "),
    cc: ((email.ccRecipients as Array<Record<string, Record<string, string>>>) || [])
      .map(r => r.emailAddress?.address)
      .filter(Boolean)
      .join(", "),
    bodyPreview: email.bodyPreview,
    body: (email.body as Record<string, string>)?.content || "",
    isRead: email.isRead,
    receivedDateTime: email.receivedDateTime,
    sentDateTime: email.sentDateTime,
    hasAttachments: email.hasAttachments,
    importance: email.importance,
    webLink: email.webLink,
  };
}

export const outlookExecutor: NodeExecutor<OutlookData> = async ({
  data,
  nodeId,
  context,
  userId,
  step,
  publish,
}) => {
  console.log(`[Outlook Node ${nodeId}] Starting execution`, {
    nodeId,
    hasCredentialId: !!data.credentialId,
    operation: data.operation,
  });

  await publish(
    outlookChannel().status({
      nodeId,
      status: "loading",
    })
  );

  // Validate required fields
  if (!data.variableName) {
    const errorMsg = "Variable name is missing";
    console.error(`[Outlook Node ${nodeId}] Error: ${errorMsg}`);
    const parsedError = parseError(new Error(errorMsg));
    await publish(
      outlookChannel().status({
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
    console.error(`[Outlook Node ${nodeId}] Error: ${errorMsg}`);
    const parsedError = parseError(new Error(errorMsg));
    await publish(
      outlookChannel().status({
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
    console.error(`[Outlook Node ${nodeId}] Error: ${errorMsg}`);
    const parsedError = parseError(new Error(errorMsg));
    await publish(
      outlookChannel().status({
        nodeId,
        status: "error",
      })
    );
    throw new NonRetriableError(
      `${parsedError.message}. ${parsedError.guidance}`
    );
  }

  try {
    const result = await step.run(`outlook-${data.operation}`, async () => {
      const accessToken = await getOutlookClient(data.credentialId!, userId);

      const headers = {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      };

      switch (data.operation) {
        case "send_email": {
          if (!data.to) {
            throw new NonRetriableError("Recipient (To) is required for sending");
          }

          const to = processTemplate(data.to, context);
          const subject = data.subject ? processTemplate(data.subject, context) : "";
          const body = data.body ? processTemplate(data.body, context) : "";
          const cc = data.cc ? processTemplate(data.cc, context) : undefined;
          const bcc = data.bcc ? processTemplate(data.bcc, context) : undefined;

          const message = createEmailBody(to, subject, body, { cc, bcc, isHtml: data.isHtml });

          const response = await fetch(`${GRAPH_API_URL}/me/sendMail`, {
            method: "POST",
            headers,
            body: JSON.stringify({ message }),
          });

          if (!response.ok) {
            const errorData = await response.text();
            throw new Error(`Failed to send email: ${errorData}`);
          }

          console.log(`[Outlook Node ${nodeId}] Sent email to: ${to}`);

          return {
            ...context,
            [variableName]: {
              sent: {
                to,
                subject,
                success: true,
              },
            },
          };
        }

        case "read_emails": {
          const maxResults = data.maxResults ? parseInt(data.maxResults, 10) : 10;
          const query = data.query ? processTemplate(data.query, context) : undefined;

          let url = `${GRAPH_API_URL}/me/messages?$top=${maxResults}&$orderby=receivedDateTime desc`;
          if (query) {
            url += `&$search="${encodeURIComponent(query)}"`;
          }

          const response = await fetch(url, { headers });

          if (!response.ok) {
            const errorData = await response.text();
            throw new Error(`Failed to read emails: ${errorData}`);
          }

          const responseData = await response.json();
          const messages = (responseData.value || []).map(parseEmailResponse);

          console.log(`[Outlook Node ${nodeId}] Listed ${messages.length} messages`);

          return {
            ...context,
            [variableName]: {
              messages,
              count: messages.length,
            },
          };
        }

        case "search_emails": {
          if (!data.query) {
            throw new NonRetriableError("Search query is required");
          }

          const query = processTemplate(data.query, context);
          const maxResults = data.maxResults ? parseInt(data.maxResults, 10) : 25;

          const url = `${GRAPH_API_URL}/me/messages?$search="${encodeURIComponent(query)}"&$top=${maxResults}`;

          const response = await fetch(url, { headers });

          if (!response.ok) {
            const errorData = await response.text();
            throw new Error(`Failed to search emails: ${errorData}`);
          }

          const responseData = await response.json();
          const messages = (responseData.value || []).map(parseEmailResponse);

          console.log(`[Outlook Node ${nodeId}] Search returned ${messages.length} messages`);

          return {
            ...context,
            [variableName]: {
              messages,
              count: messages.length,
              query,
            },
          };
        }

        case "get_email": {
          if (!data.messageId) {
            throw new NonRetriableError("Message ID is required");
          }

          const messageId = processTemplate(data.messageId, context);

          const response = await fetch(`${GRAPH_API_URL}/me/messages/${messageId}`, { headers });

          if (!response.ok) {
            const errorData = await response.text();
            throw new Error(`Failed to get email: ${errorData}`);
          }

          const email = await response.json();
          const message = parseEmailResponse(email);

          console.log(`[Outlook Node ${nodeId}] Got message: ${(message as Record<string, unknown>).subject}`);

          return {
            ...context,
            [variableName]: {
              message,
            },
          };
        }

        case "delete_email": {
          if (!data.messageId) {
            throw new NonRetriableError("Message ID is required for deletion");
          }

          const messageId = processTemplate(data.messageId, context);

          const response = await fetch(`${GRAPH_API_URL}/me/messages/${messageId}`, {
            method: "DELETE",
            headers,
          });

          if (!response.ok) {
            const errorData = await response.text();
            throw new Error(`Failed to delete email: ${errorData}`);
          }

          console.log(`[Outlook Node ${nodeId}] Deleted message: ${messageId}`);

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

        case "reply_email": {
          if (!data.messageId) {
            throw new NonRetriableError("Message ID is required for reply");
          }

          const messageId = processTemplate(data.messageId, context);
          const body = data.body ? processTemplate(data.body, context) : "";

          const response = await fetch(`${GRAPH_API_URL}/me/messages/${messageId}/reply`, {
            method: "POST",
            headers,
            body: JSON.stringify({
              comment: body,
            }),
          });

          if (!response.ok) {
            const errorData = await response.text();
            throw new Error(`Failed to reply to email: ${errorData}`);
          }

          console.log(`[Outlook Node ${nodeId}] Replied to message: ${messageId}`);

          return {
            ...context,
            [variableName]: {
              reply: {
                messageId,
                success: true,
              },
            },
          };
        }

        case "forward_email": {
          if (!data.messageId) {
            throw new NonRetriableError("Message ID is required for forwarding");
          }

          if (!data.forwardTo) {
            throw new NonRetriableError("Forward recipient is required");
          }

          const messageId = processTemplate(data.messageId, context);
          const forwardTo = processTemplate(data.forwardTo, context);
          const comment = data.body ? processTemplate(data.body, context) : "";

          const response = await fetch(`${GRAPH_API_URL}/me/messages/${messageId}/forward`, {
            method: "POST",
            headers,
            body: JSON.stringify({
              comment,
              toRecipients: forwardTo.split(",").map(email => ({
                emailAddress: { address: email.trim() },
              })),
            }),
          });

          if (!response.ok) {
            const errorData = await response.text();
            throw new Error(`Failed to forward email: ${errorData}`);
          }

          console.log(`[Outlook Node ${nodeId}] Forwarded message ${messageId} to: ${forwardTo}`);

          return {
            ...context,
            [variableName]: {
              forwarded: {
                messageId,
                forwardedTo: forwardTo,
                success: true,
              },
            },
          };
        }

        case "mark_as_read": {
          if (!data.messageId) {
            throw new NonRetriableError("Message ID is required");
          }

          const messageId = processTemplate(data.messageId, context);
          const markAsRead = data.markAsRead !== false; // Default to marking as read

          const response = await fetch(`${GRAPH_API_URL}/me/messages/${messageId}`, {
            method: "PATCH",
            headers,
            body: JSON.stringify({
              isRead: markAsRead,
            }),
          });

          if (!response.ok) {
            const errorData = await response.text();
            throw new Error(`Failed to update email: ${errorData}`);
          }

          console.log(`[Outlook Node ${nodeId}] Marked message ${messageId} as ${markAsRead ? "read" : "unread"}`);

          return {
            ...context,
            [variableName]: {
              updated: {
                id: messageId,
                isRead: markAsRead,
                success: true,
              },
            },
          };
        }

        default:
          throw new NonRetriableError(`Unsupported operation: ${data.operation}`);
      }
    });

    await publish(
      outlookChannel().status({
        nodeId,
        status: "success",
      })
    );

    return result;
  } catch (error) {
    console.error(`[Outlook Node ${nodeId}] Execution error:`, error);
    
    const parsedError = parseError(error as Error);
    
    await publish(
      outlookChannel().status({
        nodeId,
        status: "error",
      })
    );

    throw new NonRetriableError(
      `${parsedError.message}. ${parsedError.guidance}`
    );
  }
};
