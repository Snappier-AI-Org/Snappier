import type { NodeExecutor } from "@/features/executions/types";
import { NonRetriableError } from "inngest";
import { googleDocsChannel } from "@/inngest/channels/google-docs";
import prisma from "@/lib/db";
import { decrypt, encrypt } from "@/lib/encryption";
import { google, docs_v1 } from "googleapis";
import { processTemplate, debugTemplateContext } from "@/features/executions/lib/handlebars-utils";

// =============================================================================
// Types
// =============================================================================

type GoogleDocsData = {
  variableName?: string;
  credentialId?: string;
  operation?: "get" | "create" | "append" | "replace" | "batchUpdate";
  documentId?: string;
  title?: string;
  content?: string;
  findText?: string;
  replaceText?: string;
  insertIndex?: string;
  requests?: string; // JSON string for batchUpdate requests
};

type OAuthTokenData = {
  accessToken: string;
  refreshToken?: string;
  tokenExpiry?: number;
  email?: string;
  tokenType: "oauth";
};

// =============================================================================
// OAuth Token Management
// =============================================================================

async function refreshAccessToken(refreshToken: string): Promise<{
  accessToken: string;
  expiryDate: number;
}> {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_DOCS_CLIENT_ID,
    process.env.GOOGLE_DOCS_CLIENT_SECRET,
    process.env.GOOGLE_DOCS_REDIRECT_URL
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

async function getDocsClient(credentialId: string, userId: string) {
  const credential = await prisma.credential.findFirst({
    where: { id: credentialId, userId },
  });

  if (!credential) {
    throw new NonRetriableError("Google Docs credential not found");
  }

  const decryptedValue = decrypt(credential.value);
  let tokenData: OAuthTokenData;

  try {
    tokenData = JSON.parse(decryptedValue);
  } catch {
    throw new NonRetriableError(
      "Invalid credential format. Please reconnect your Google Docs account."
    );
  }

  // Validate OAuth token structure
  if (!tokenData.accessToken) {
    throw new NonRetriableError(
      "Invalid credential: missing access token. Please reconnect your Google Docs account."
    );
  }

  let accessToken = tokenData.accessToken;

  // Check if token is expired or about to expire (within 5 minutes)
  const isExpired = tokenData.tokenExpiry
    ? tokenData.tokenExpiry < Date.now() + 5 * 60 * 1000
    : false;

  if (isExpired && tokenData.refreshToken) {
    console.log(`[Google Docs] Token expired, refreshing...`);

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

      console.log(`[Google Docs] Token refreshed successfully`);
    } catch (refreshError) {
      console.error(`[Google Docs] Failed to refresh token:`, refreshError);
      throw new NonRetriableError(
        "Failed to refresh Google Docs access token. Please reconnect your account."
      );
    }
  }

  // Create OAuth2 client with access token
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_DOCS_CLIENT_ID,
    process.env.GOOGLE_DOCS_CLIENT_SECRET,
    process.env.GOOGLE_DOCS_REDIRECT_URL
  );

  oauth2Client.setCredentials({
    access_token: accessToken,
    refresh_token: tokenData.refreshToken,
  });

  return google.docs({ version: "v1", auth: oauth2Client });
}

// Helper Functions are now imported from handlebars-utils

// =============================================================================
// Document Operations
// =============================================================================

async function getDocument(
  docs: docs_v1.Docs,
  documentId: string
): Promise<docs_v1.Schema$Document> {
  console.log(`[Google Docs] Getting document: ${documentId}`);

  const response = await docs.documents.get({
    documentId,
  });

  return response.data;
}

async function createDocument(
  docs: docs_v1.Docs,
  title: string,
  content?: string
): Promise<docs_v1.Schema$Document> {
  console.log(`[Google Docs] Creating document: ${title}`);

  // Create the document
  const createResponse = await docs.documents.create({
    requestBody: {
      title,
    },
  });

  const documentId = createResponse.data.documentId;

  if (!documentId) {
    throw new Error("Failed to create document - no document ID returned");
  }

  // If content is provided, add it to the document
  if (content && content.trim()) {
    await docs.documents.batchUpdate({
      documentId,
      requestBody: {
        requests: [
          {
            insertText: {
              location: {
                index: 1, // Start of document body
              },
              text: content,
            },
          },
        ],
      },
    });
  }

  // Return the updated document
  const getResponse = await docs.documents.get({ documentId });
  return getResponse.data;
}

async function appendToDocument(
  docs: docs_v1.Docs,
  documentId: string,
  content: string
): Promise<docs_v1.Schema$Document> {
  console.log(`[Google Docs] Appending to document: ${documentId}`);

  // Get the document to find the end index
  const doc = await docs.documents.get({ documentId });
  const body = doc.data.body;
  
  // Find the end index of the body content
  let endIndex = 1;
  if (body?.content) {
    const lastElement = body.content[body.content.length - 1];
    if (lastElement?.endIndex) {
      endIndex = lastElement.endIndex - 1; // Insert before the final newline
    }
  }

  await docs.documents.batchUpdate({
    documentId,
    requestBody: {
      requests: [
        {
          insertText: {
            location: {
              index: endIndex,
            },
            text: content,
          },
        },
      ],
    },
  });

  // Return the updated document
  const getResponse = await docs.documents.get({ documentId });
  return getResponse.data;
}

async function replaceTextInDocument(
  docs: docs_v1.Docs,
  documentId: string,
  findText: string,
  replaceText: string
): Promise<docs_v1.Schema$Document> {
  console.log(`[Google Docs] Replacing text in document: ${documentId}`);

  await docs.documents.batchUpdate({
    documentId,
    requestBody: {
      requests: [
        {
          replaceAllText: {
            containsText: {
              text: findText,
              matchCase: true,
            },
            replaceText: replaceText,
          },
        },
      ],
    },
  });

  // Return the updated document
  const getResponse = await docs.documents.get({ documentId });
  return getResponse.data;
}

async function batchUpdateDocument(
  docs: docs_v1.Docs,
  documentId: string,
  requests: docs_v1.Schema$Request[]
): Promise<docs_v1.Schema$BatchUpdateDocumentResponse> {
  console.log(`[Google Docs] Batch update on document: ${documentId}`);

  const response = await docs.documents.batchUpdate({
    documentId,
    requestBody: {
      requests,
    },
  });

  return response.data;
}

// =============================================================================
// Main Executor
// =============================================================================

export const googleDocsExecutor: NodeExecutor<GoogleDocsData> = async ({
  data,
  nodeId,
  context,
  userId,
  step,
  publish,
}) => {
  const variableName = data.variableName || "googleDocs";

  return step.run(`google-docs-${nodeId}`, async () => {
    try {
      // Publish loading status
      await publish(googleDocsChannel().status({ nodeId, status: "loading" }));

      // Validate required fields
      if (!data.credentialId) {
        throw new NonRetriableError(
          "Google Docs credential is required. Please configure the node with a valid credential."
        );
      }

      const operation = data.operation || "get";
      console.log(`[Google Docs] Executing operation: ${operation}`);

      // Get the Google Docs client
      const docs = await getDocsClient(data.credentialId, userId);

      let result: Record<string, unknown>;

      switch (operation) {
        case "get": {
          if (!data.documentId) {
            throw new NonRetriableError("Document ID is required for get operation");
          }
          const processedDocumentId = processTemplate(data.documentId, context);
          const document = await getDocument(docs, processedDocumentId);
          
          // Extract plain text content from the document
          let plainText = "";
          if (document.body?.content) {
            for (const element of document.body.content) {
              if (element.paragraph?.elements) {
                for (const textElement of element.paragraph.elements) {
                  if (textElement.textRun?.content) {
                    plainText += textElement.textRun.content;
                  }
                }
              }
            }
          }

          result = {
            document: {
              documentId: document.documentId,
              title: document.title,
              revisionId: document.revisionId,
            },
            content: plainText,
            raw: document,
          };
          break;
        }

        case "create": {
          if (!data.title) {
            throw new NonRetriableError("Title is required for create operation");
          }
          const processedTitle = processTemplate(data.title, context);
          const processedContent = data.content 
            ? processTemplate(data.content, context) 
            : undefined;
          const document = await createDocument(docs, processedTitle, processedContent);
          
          result = {
            created: {
              documentId: document.documentId,
              title: document.title,
              revisionId: document.revisionId,
            },
          };
          break;
        }

        case "append": {
          if (!data.documentId) {
            throw new NonRetriableError("Document ID is required for append operation");
          }
          if (!data.content) {
            throw new NonRetriableError("Content is required for append operation");
          }
          
          // Debug logging to trace template processing
          console.log(`[Google Docs] Append operation - Context received:`, {
            contextKeys: Object.keys(context),
            hasGoogleForm: 'googleForm' in context,
            googleFormKeys: context.googleForm && typeof context.googleForm === 'object' 
              ? Object.keys(context.googleForm as object) 
              : 'N/A',
            googleFormData: context.googleForm,
          });
          console.log(`[Google Docs] Append operation - Raw content template:`, data.content);
          
          // #region agent log
          fetch('http://127.0.0.1:7242/ingest/409f2c88-a960-40ed-8c60-3380a93586bf',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'google-docs/executor.ts:386',message:'GoogleDocs append pre-process',data:{rawContent:data.content,contextKeys:Object.keys(context),contextSnapshot:JSON.stringify(context).slice(0,1000)},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'B,C,D'})}).catch(()=>{});
          // #endregion
          
          const processedDocumentId = processTemplate(data.documentId, context);
          const processedContent = processTemplate(data.content, context);
          
          // #region agent log
          fetch('http://127.0.0.1:7242/ingest/409f2c88-a960-40ed-8c60-3380a93586bf',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'google-docs/executor.ts:395',message:'GoogleDocs append post-process',data:{rawContent:data.content,processedContent:processedContent.slice(0,500),literalBracketsFound:processedContent.includes('{{')},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'B,C,D'})}).catch(()=>{});
          // #endregion
          
          console.log(`[Google Docs] Append operation - Processed content:`, processedContent);
          
          const document = await appendToDocument(docs, processedDocumentId, processedContent);
          
          result = {
            appended: {
              documentId: document.documentId,
              title: document.title,
              revisionId: document.revisionId,
            },
          };
          break;
        }

        case "replace": {
          if (!data.documentId) {
            throw new NonRetriableError("Document ID is required for replace operation");
          }
          if (!data.findText) {
            throw new NonRetriableError("Find text is required for replace operation");
          }
          if (data.replaceText === undefined) {
            throw new NonRetriableError("Replace text is required for replace operation");
          }
          const processedDocumentId = processTemplate(data.documentId, context);
          const processedFindText = processTemplate(data.findText, context);
          const processedReplaceText = processTemplate(data.replaceText, context);
          const document = await replaceTextInDocument(
            docs,
            processedDocumentId,
            processedFindText,
            processedReplaceText
          );
          
          result = {
            replaced: {
              documentId: document.documentId,
              title: document.title,
              revisionId: document.revisionId,
            },
          };
          break;
        }

        case "batchUpdate": {
          if (!data.documentId) {
            throw new NonRetriableError("Document ID is required for batchUpdate operation");
          }
          if (!data.requests) {
            throw new NonRetriableError("Requests JSON is required for batchUpdate operation");
          }
          const processedDocumentId = processTemplate(data.documentId, context);
          const processedRequests = processTemplate(data.requests, context);
          
          let requests: docs_v1.Schema$Request[];
          try {
            requests = JSON.parse(processedRequests);
          } catch {
            throw new NonRetriableError(
              "Invalid requests JSON format. Please provide a valid JSON array of requests."
            );
          }

          const response = await batchUpdateDocument(docs, processedDocumentId, requests);
          
          result = {
            batchUpdate: {
              documentId: processedDocumentId,
              replies: response.replies,
              writeControl: response.writeControl,
            },
          };
          break;
        }

        default:
          throw new NonRetriableError(`Unknown operation: ${operation}`);
      }

      // Publish success status
      await publish(googleDocsChannel().status({ nodeId, status: "success" }));

      console.log(`[Google Docs] Operation ${operation} completed successfully`);

      return {
        ...context,
        [variableName]: result,
      };
    } catch (error) {
      console.error(`[Google Docs] Error in operation:`, error);

      // Publish error status
      await publish(googleDocsChannel().status({ nodeId, status: "error" }));

      // Handle Google API errors
      if (error instanceof Error) {
        const message = error.message;
        
        if (message.includes("invalid_grant") || message.includes("Token has been expired")) {
          throw new NonRetriableError(
            "Google Docs authentication expired. Please reconnect your Google account in the Credentials page."
          );
        }
        
        if (message.includes("not found") || message.includes("404")) {
          throw new NonRetriableError(
            "Document not found. Please verify the document ID is correct and you have access to it."
          );
        }

        if (message.includes("permission") || message.includes("403")) {
          throw new NonRetriableError(
            "Permission denied. Please ensure you have access to this document."
          );
        }

        if (message.includes("quota") || message.includes("429")) {
          throw new Error(
            "Google API quota exceeded. Please try again later."
          );
        }
      }

      throw error;
    }
  });
};
