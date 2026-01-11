import type { NodeExecutor } from "@/features/executions/types";
import { NonRetriableError } from "inngest";
import { googleSheetsChannel } from "@/inngest/channels/google-sheets";
import { parseError } from "@/features/executions/lib/error-parser";
import prisma from "@/lib/db";
import { decrypt, encrypt } from "@/lib/encryption";
import { google } from "googleapis";
import { processTemplate } from "@/features/executions/lib/handlebars-utils";

// =============================================================================
// Types
// =============================================================================

type GoogleSheetsData = {
  variableName?: string;
  credentialId?: string;
  spreadsheetId?: string;
  sheetName?: string;
  range?: string;
  operation?: "read" | "append" | "update";
  values?: string;
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
    process.env.GOOGLE_SHEETS_CLIENT_ID,
    process.env.GOOGLE_SHEETS_CLIENT_SECRET,
    process.env.GOOGLE_SHEETS_REDIRECT_URL
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

async function getSheetsClient(credentialId: string, userId: string) {
  const credential = await prisma.credential.findFirst({
    where: { id: credentialId, userId },
  });

  if (!credential) {
    throw new NonRetriableError("Google Sheets credential not found");
  }

  const decryptedValue = decrypt(credential.value);
  let tokenData: OAuthTokenData;

  try {
    tokenData = JSON.parse(decryptedValue);
  } catch {
    throw new NonRetriableError(
      "Invalid credential format. Please reconnect your Google Sheets account."
    );
  }

  // Validate OAuth token structure
  if (!tokenData.accessToken) {
    throw new NonRetriableError(
      "Invalid credential: missing access token. Please reconnect your Google Sheets account."
    );
  }

  let accessToken = tokenData.accessToken;

  // Check if token is expired or about to expire (within 5 minutes)
  const isExpired = tokenData.tokenExpiry
    ? tokenData.tokenExpiry < Date.now() + 5 * 60 * 1000
    : false;

  if (isExpired && tokenData.refreshToken) {
    console.log("[Google Sheets] Token expired, refreshing...");

    try {
      const refreshed = await refreshAccessToken(tokenData.refreshToken);
      accessToken = refreshed.accessToken;

      // Update stored credential with new access token
      const updatedTokenData: OAuthTokenData = {
        ...tokenData,
        accessToken: refreshed.accessToken,
        tokenExpiry: refreshed.expiryDate,
        tokenType: "oauth",
      };

      await prisma.credential.update({
        where: { id: credentialId },
        data: { value: encrypt(JSON.stringify(updatedTokenData)) },
      });

      console.log("[Google Sheets] Token refreshed successfully");
    } catch (refreshError) {
      console.error("[Google Sheets] Failed to refresh token:", refreshError);
      throw new NonRetriableError(
        "Failed to refresh Google Sheets access token. Please reconnect your account."
      );
    }
  }

  // Create OAuth2 client with access token
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_SHEETS_CLIENT_ID,
    process.env.GOOGLE_SHEETS_CLIENT_SECRET,
    process.env.GOOGLE_SHEETS_REDIRECT_URL
  );

  oauth2Client.setCredentials({
    access_token: accessToken,
    refresh_token: tokenData.refreshToken,
  });

  return google.sheets({ version: "v4", auth: oauth2Client });
}

// =============================================================================
// Range Formatting Helpers
// =============================================================================

/**
 * Formats a sheet name for use in A1 notation.
 * Sheet names with spaces or special characters need to be quoted.
 */
function formatSheetName(sheetName: string): string {
  const trimmed = sheetName.trim();
  // Quote sheet names that contain spaces, quotes, or other special characters
  if (/[\s'!:]/.test(trimmed)) {
    // Escape single quotes by doubling them
    const escaped = trimmed.replace(/'/g, "''");
    return `'${escaped}'`;
  }
  return trimmed;
}

/**
 * Builds a valid A1 notation range for Google Sheets API.
 * @param sheetName - The name of the sheet
 * @param range - Optional cell range (e.g., "A1:B10"). If empty, defaults to A1:Z1000
 * @returns A valid A1 notation string like "Sheet1!A1:B10"
 */
function buildRange(sheetName: string, range?: string): string {
  const formattedSheet = formatSheetName(sheetName);
  const cellRange = range?.trim() || "A1:Z1000";
  
  // If range already contains sheet reference, use as-is
  if (cellRange.includes("!")) {
    return cellRange;
  }
  
  return `${formattedSheet}!${cellRange}`;
}

// =============================================================================
// Sheet Operations
// =============================================================================

type SheetsClient = Awaited<ReturnType<typeof getSheetsClient>>;

async function readSheet(
  sheets: SheetsClient,
  spreadsheetId: string,
  range: string
): Promise<unknown[][]> {
  console.log(`[Google Sheets] Reading spreadsheet: ${spreadsheetId}, range: ${range}`);

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range,
  });

  return response.data.values || [];
}

async function appendToSheet(
  sheets: SheetsClient,
  spreadsheetId: string,
  range: string,
  values: unknown[][]
): Promise<{ updatedRows: number }> {
  console.log(`[Google Sheets] Appending to spreadsheet: ${spreadsheetId}, range: ${range}`);

  const response = await sheets.spreadsheets.values.append({
    spreadsheetId,
    range,
    valueInputOption: "USER_ENTERED",
    insertDataOption: "INSERT_ROWS",
    requestBody: { values },
  });

  return {
    updatedRows: response.data.updates?.updatedRows || 0,
  };
}

async function updateSheet(
  sheets: SheetsClient,
  spreadsheetId: string,
  range: string,
  values: unknown[][]
): Promise<{ updatedRows: number; updatedCells: number }> {
  console.log(`[Google Sheets] Updating spreadsheet: ${spreadsheetId}, range: ${range}`);

  const response = await sheets.spreadsheets.values.update({
    spreadsheetId,
    range,
    valueInputOption: "USER_ENTERED",
    requestBody: { values },
  });

  return {
    updatedRows: response.data.updatedRows || 0,
    updatedCells: response.data.updatedCells || 0,
  };
}

// =============================================================================
// Main Executor
// =============================================================================

export const googleSheetsExecutor: NodeExecutor<GoogleSheetsData> = async ({
  data,
  nodeId,
  context,
  userId,
  step,
  publish,
}) => {
  console.log(`[Google Sheets Node ${nodeId}] Starting execution`, {
    operation: data.operation,
    hasCredentialId: !!data.credentialId,
    hasSpreadsheetId: !!data.spreadsheetId,
  });

  await publish(googleSheetsChannel().status({ nodeId, status: "loading" }));

  // ---------------------------------------------------------------------------
  // Input Validation
  // ---------------------------------------------------------------------------

  if (!data.variableName?.trim()) {
    await publish(googleSheetsChannel().status({ nodeId, status: "error" }));
    const error = parseError(new Error("Variable name is required"));
    throw new NonRetriableError(`${error.message}. ${error.guidance}`);
  }

  if (!data.credentialId) {
    await publish(googleSheetsChannel().status({ nodeId, status: "error" }));
    const error = parseError(new Error("Google Sheets credential is required"));
    throw new NonRetriableError(`${error.message}. ${error.guidance}`);
  }

  if (!data.spreadsheetId?.trim()) {
    await publish(googleSheetsChannel().status({ nodeId, status: "error" }));
    const error = parseError(new Error("Spreadsheet ID is required"));
    throw new NonRetriableError(`${error.message}. ${error.guidance}`);
  }

  if (!data.operation) {
    await publish(googleSheetsChannel().status({ nodeId, status: "error" }));
    const error = parseError(new Error("Operation is required"));
    throw new NonRetriableError(`${error.message}. ${error.guidance}`);
  }

  const variableName = data.variableName.trim();

  try {
    const result = await step.run(`sheets-${nodeId}`, async () => {
      // Get authenticated Sheets client
      const sheets = await getSheetsClient(data.credentialId!, userId);

      // Process template variables in inputs
      const spreadsheetId = processTemplate(data.spreadsheetId!, context);
      const sheetName = data.sheetName
        ? processTemplate(data.sheetName, context)
        : "Sheet1";
      const userRange = data.range
        ? processTemplate(data.range, context)
        : "";

      // ---------------------------------------------------------------------------
      // Execute Operation
      // ---------------------------------------------------------------------------

      switch (data.operation) {
        case "read": {
          const range = buildRange(sheetName, userRange);
          const values = await readSheet(sheets, spreadsheetId, range);

          return {
            ...context,
            [variableName]: {
              values,
              range,
              rowCount: values.length,
            },
          };
        }

        case "append": {
          if (!data.values?.trim()) {
            throw new NonRetriableError("Values are required for append operation");
          }

          const valuesJson = processTemplate(data.values, context);
          let values: unknown[][];

          try {
            values = JSON.parse(valuesJson);
          } catch {
            throw new NonRetriableError(
              "Invalid JSON format for values. Expected a 2D array like [[\"a\", \"b\"], [\"c\", \"d\"]]"
            );
          }

          if (!Array.isArray(values) || !values.every(Array.isArray)) {
            throw new NonRetriableError(
              "Values must be a 2D array like [[\"a\", \"b\"], [\"c\", \"d\"]]"
            );
          }

          // For append, we use A1 as starting point
          const range = buildRange(sheetName, "A1");
          const result = await appendToSheet(sheets, spreadsheetId, range, values);

          return {
            ...context,
            [variableName]: {
              ...result,
              appendedValues: values,
            },
          };
        }

        case "update": {
          if (!data.values?.trim()) {
            throw new NonRetriableError("Values are required for update operation");
          }

          if (!userRange) {
            throw new NonRetriableError("Range is required for update operation");
          }

          const valuesJson = processTemplate(data.values, context);
          let values: unknown[][];

          try {
            values = JSON.parse(valuesJson);
          } catch {
            throw new NonRetriableError(
              "Invalid JSON format for values. Expected a 2D array like [[\"a\", \"b\"], [\"c\", \"d\"]]"
            );
          }

          if (!Array.isArray(values) || !values.every(Array.isArray)) {
            throw new NonRetriableError(
              "Values must be a 2D array like [[\"a\", \"b\"], [\"c\", \"d\"]]"
            );
          }

          const range = buildRange(sheetName, userRange);
          const result = await updateSheet(sheets, spreadsheetId, range, values);

          return {
            ...context,
            [variableName]: {
              ...result,
              updatedValues: values,
              range,
            },
          };
        }

        default:
          throw new NonRetriableError(`Unknown operation: ${data.operation}`);
      }
    });

    await publish(googleSheetsChannel().status({ nodeId, status: "success" }));
    return result;

  } catch (error) {
    console.error(`[Google Sheets Node ${nodeId}] Execution failed:`, error);

    await publish(googleSheetsChannel().status({ nodeId, status: "error" }));

    // Re-throw NonRetriableError as-is to preserve message
    if (error instanceof NonRetriableError) {
      throw error;
    }

    // Wrap other errors
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new NonRetriableError(errorMessage);
  }
};
