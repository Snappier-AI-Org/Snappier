import type { NodeExecutor } from "@/features/executions/types";
import { NonRetriableError } from "inngest";
import { googleDriveChannel } from "@/inngest/channels/google-drive";
import { parseError } from "@/features/executions/lib/error-parser";
import prisma from "@/lib/db";
import { decrypt, encrypt } from "@/lib/encryption";
import { google } from "googleapis";
import { processTemplate } from "@/features/executions/lib/handlebars-utils";

type GoogleDriveData = {
  variableName?: string;
  credentialId?: string;
  operation?: "list" | "upload" | "download" | "create_folder" | "delete" | "move" | "copy" | "share";
  folderId?: string;
  fileId?: string;
  fileName?: string;
  fileContent?: string;
  mimeType?: string;
  destinationFolderId?: string;
  shareEmail?: string;
  shareRole?: "reader" | "commenter" | "writer";
  query?: string;
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
    process.env.GOOGLE_DRIVE_CLIENT_ID,
    process.env.GOOGLE_DRIVE_CLIENT_SECRET,
    process.env.GOOGLE_DRIVE_REDIRECT_URL
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

async function getDriveClient(credentialId: string, userId: string) {
  const credential = await prisma.credential.findFirst({
    where: { id: credentialId, userId },
  });

  if (!credential) {
    throw new NonRetriableError("Google Drive credential not found");
  }

  const decryptedValue = decrypt(credential.value);
  let tokenData: OAuthTokenData;

  try {
    tokenData = JSON.parse(decryptedValue);
  } catch {
    throw new NonRetriableError("Invalid credential format. Please reconnect your Google Drive account.");
  }

  // Check if this is an OAuth token
  if (tokenData.tokenType === "oauth") {
    let accessToken = tokenData.accessToken;

    // Check if token is expired or about to expire (within 5 minutes)
    const isExpired = tokenData.tokenExpiry 
      ? tokenData.tokenExpiry < Date.now() + 5 * 60 * 1000
      : false;

    if (isExpired && tokenData.refreshToken) {
      console.log(`[Google Drive] Token expired, refreshing...`);
      
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

        console.log(`[Google Drive] Token refreshed successfully`);
      } catch (refreshError) {
        console.error(`[Google Drive] Failed to refresh token:`, refreshError);
        throw new NonRetriableError(
          "Failed to refresh Google Drive access token. Please reconnect your account."
        );
      }
    }

    // Create OAuth2 client with access token
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_DRIVE_CLIENT_ID,
      process.env.GOOGLE_DRIVE_CLIENT_SECRET,
      process.env.GOOGLE_DRIVE_REDIRECT_URL
    );

    oauth2Client.setCredentials({
      access_token: accessToken,
      refresh_token: tokenData.refreshToken,
    });

    return google.drive({ version: "v3", auth: oauth2Client });
  }

  // Fallback to service account (for backwards compatibility)
  const auth = new google.auth.GoogleAuth({
    credentials: tokenData as unknown as Record<string, unknown>,
    scopes: [
      "https://www.googleapis.com/auth/drive",
      "https://www.googleapis.com/auth/drive.file",
    ],
  });

  return google.drive({ version: "v3", auth });
}

export const googleDriveExecutor: NodeExecutor<GoogleDriveData> = async ({
  data,
  nodeId,
  context,
  userId,
  step,
  publish,
}) => {
  console.log(`[Google Drive Node ${nodeId}] Starting execution`, {
    nodeId,
    hasCredentialId: !!data.credentialId,
    operation: data.operation,
  });

  await publish(
    googleDriveChannel().status({
      nodeId,
      status: "loading",
    })
  );

  // Validate required fields
  if (!data.variableName) {
    const errorMsg = "Variable name is missing";
    console.error(`[Google Drive Node ${nodeId}] Error: ${errorMsg}`);
    const parsedError = parseError(new Error(errorMsg));
    await publish(
      googleDriveChannel().status({
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
    console.error(`[Google Drive Node ${nodeId}] Error: ${errorMsg}`);
    const parsedError = parseError(new Error(errorMsg));
    await publish(
      googleDriveChannel().status({
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
    console.error(`[Google Drive Node ${nodeId}] Error: ${errorMsg}`);
    const parsedError = parseError(new Error(errorMsg));
    await publish(
      googleDriveChannel().status({
        nodeId,
        status: "error",
      })
    );
    throw new NonRetriableError(
      `${parsedError.message}. ${parsedError.guidance}`
    );
  }

  try {
    const result = await step.run(`google-drive-${data.operation}`, async () => {
      const drive = await getDriveClient(data.credentialId!, userId);

      switch (data.operation) {
        case "list": {
          let query = "trashed = false";
          
          if (data.folderId) {
            query += ` and '${data.folderId}' in parents`;
          }
          
          if (data.query) {
            const compiledQuery = processTemplate(data.query, context);
            query += ` and ${compiledQuery}`;
          }

          const response = await drive.files.list({
            q: query,
            fields: "files(id, name, mimeType, webViewLink, iconLink, modifiedTime, size, parents)",
            pageSize: 100,
          });

          console.log(`[Google Drive Node ${nodeId}] Listed ${response.data.files?.length || 0} files`);

          return {
            ...context,
            [variableName]: {
              files: response.data.files || [],
              count: response.data.files?.length || 0,
            },
          };
        }

        case "upload": {
          if (!data.fileName) {
            throw new NonRetriableError("File name is required for upload");
          }

          const fileName = processTemplate(data.fileName, context);
          const fileContent = data.fileContent
            ? processTemplate(data.fileContent, context)
            : "";
          // Handle "auto" as auto-detect (use text/plain as default)
          const mimeType = (!data.mimeType || data.mimeType === "auto") ? "text/plain" : data.mimeType;

          const fileMetadata: { name: string; parents?: string[] } = {
            name: fileName,
          };

          if (data.folderId) {
            fileMetadata.parents = [data.folderId];
          }

          const response = await drive.files.create({
            requestBody: fileMetadata,
            media: {
              mimeType,
              body: fileContent,
            },
            fields: "id, name, webViewLink, mimeType",
          });

          console.log(`[Google Drive Node ${nodeId}] Uploaded file: ${response.data.name}`);

          return {
            ...context,
            [variableName]: {
              file: {
                id: response.data.id,
                name: response.data.name,
                webViewLink: response.data.webViewLink,
                mimeType: response.data.mimeType,
              },
            },
          };
        }

        case "download": {
          if (!data.fileId) {
            throw new NonRetriableError("File ID is required for download");
          }

          // Get file metadata first
          const metadata = await drive.files.get({
            fileId: data.fileId,
            fields: "id, name, mimeType",
          });

          // Download file content
          const response = await drive.files.get(
            { fileId: data.fileId, alt: "media" },
            { responseType: "text" }
          );

          console.log(`[Google Drive Node ${nodeId}] Downloaded file: ${metadata.data.name}`);

          return {
            ...context,
            [variableName]: {
              content: response.data,
              file: {
                id: metadata.data.id,
                name: metadata.data.name,
                mimeType: metadata.data.mimeType,
              },
            },
          };
        }

        case "create_folder": {
          if (!data.fileName) {
            throw new NonRetriableError("Folder name is required");
          }

          const folderName = processTemplate(data.fileName, context);

          const fileMetadata: { name: string; mimeType: string; parents?: string[] } = {
            name: folderName,
            mimeType: "application/vnd.google-apps.folder",
          };

          if (data.folderId) {
            fileMetadata.parents = [data.folderId];
          }

          const response = await drive.files.create({
            requestBody: fileMetadata,
            fields: "id, name, webViewLink",
          });

          console.log(`[Google Drive Node ${nodeId}] Created folder: ${response.data.name}`);

          return {
            ...context,
            [variableName]: {
              folder: {
                id: response.data.id,
                name: response.data.name,
                webViewLink: response.data.webViewLink,
              },
            },
          };
        }

        case "delete": {
          if (!data.fileId) {
            throw new NonRetriableError("File ID is required for delete");
          }

          // Get file info before deletion
          const metadata = await drive.files.get({
            fileId: data.fileId,
            fields: "id, name",
          });

          await drive.files.delete({ fileId: data.fileId });

          console.log(`[Google Drive Node ${nodeId}] Deleted: ${metadata.data.name}`);

          return {
            ...context,
            [variableName]: {
              deleted: true,
              file: {
                id: metadata.data.id,
                name: metadata.data.name,
              },
            },
          };
        }

        case "move": {
          if (!data.fileId) {
            throw new NonRetriableError("File ID is required for move");
          }
          if (!data.destinationFolderId) {
            throw new NonRetriableError("Destination folder ID is required for move");
          }

          // Get current parents
          const file = await drive.files.get({
            fileId: data.fileId,
            fields: "parents, name",
          });

          const previousParents = file.data.parents?.join(",") || "";

          // Move file to new folder
          const response = await drive.files.update({
            fileId: data.fileId,
            addParents: data.destinationFolderId,
            removeParents: previousParents,
            fields: "id, name, parents, webViewLink",
          });

          console.log(`[Google Drive Node ${nodeId}] Moved file: ${response.data.name}`);

          return {
            ...context,
            [variableName]: {
              moved: true,
              file: {
                id: response.data.id,
                name: response.data.name,
                webViewLink: response.data.webViewLink,
                newParents: response.data.parents,
              },
            },
          };
        }

        case "copy": {
          if (!data.fileId) {
            throw new NonRetriableError("File ID is required for copy");
          }

          const copyMetadata: { parents?: string[] } = {};
          if (data.destinationFolderId) {
            copyMetadata.parents = [data.destinationFolderId];
          }

          const response = await drive.files.copy({
            fileId: data.fileId,
            requestBody: copyMetadata,
            fields: "id, name, webViewLink, parents",
          });

          console.log(`[Google Drive Node ${nodeId}] Copied file: ${response.data.name}`);

          return {
            ...context,
            [variableName]: {
              copied: true,
              file: {
                id: response.data.id,
                name: response.data.name,
                webViewLink: response.data.webViewLink,
              },
            },
          };
        }

        case "share": {
          if (!data.fileId) {
            throw new NonRetriableError("File ID is required for share");
          }
          if (!data.shareEmail) {
            throw new NonRetriableError("Email address is required for share");
          }

          const shareEmail = processTemplate(data.shareEmail, context);
          const shareRole = data.shareRole || "reader";

          await drive.permissions.create({
            fileId: data.fileId,
            requestBody: {
              type: "user",
              role: shareRole,
              emailAddress: shareEmail,
            },
          });

          // Get file info
          const metadata = await drive.files.get({
            fileId: data.fileId,
            fields: "id, name, webViewLink",
          });

          console.log(`[Google Drive Node ${nodeId}] Shared ${metadata.data.name} with ${shareEmail}`);

          return {
            ...context,
            [variableName]: {
              shared: true,
              file: {
                id: metadata.data.id,
                name: metadata.data.name,
                webViewLink: metadata.data.webViewLink,
              },
              sharedWith: {
                email: shareEmail,
                role: shareRole,
              },
            },
          };
        }

        default:
          throw new NonRetriableError(`Unknown operation: ${data.operation}`);
      }
    });

    await publish(
      googleDriveChannel().status({
        nodeId,
        status: "success",
      })
    );

    return result;
  } catch (error) {
    console.error(`[Google Drive Node ${nodeId}] Error:`, error);
    
    await publish(
      googleDriveChannel().status({
        nodeId,
        status: "error",
      })
    );

    if (error instanceof NonRetriableError) {
      throw error;
    }

    const errorMessage = error instanceof Error ? error.message : String(error);
    const parsedError = parseError(new Error(errorMessage));
    throw new NonRetriableError(
      `Google Drive error: ${parsedError.message}. ${parsedError.guidance}`
    );
  }
};
