"use server";

import { getSubscriptionToken, type Realtime } from "@inngest/realtime";
import { googleSheetsChannel } from "@/inngest/channels/google-sheets";
import { inngest } from "@/inngest/client";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import prisma from "@/lib/db";
import { decrypt, encrypt } from "@/lib/encryption";
import { google } from "googleapis";

export type GoogleSheetsToken = Realtime.Token<
  typeof googleSheetsChannel,
  ["status"]
>;

export async function fetchGoogleSheetsRealtimeToken(): Promise<GoogleSheetsToken> {
  const token = await getSubscriptionToken(inngest, {
    channel: googleSheetsChannel(),
    topics: ["status"],
  });

  return token;
}

// =============================================================================
// Types for Sheet Fetching
// =============================================================================

type OAuthTokenData = {
  accessToken: string;
  refreshToken?: string;
  tokenExpiry?: number;
  email?: string;
  tokenType: "oauth";
};

type SheetInfo = {
  sheetId: number;
  title: string;
  index: number;
};

type FetchSheetsResult = {
  success: boolean;
  sheets?: SheetInfo[];
  error?: string;
};

// =============================================================================
// Helper Functions
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

async function getSheetsClientFromCredential(credentialId: string, userId: string) {
  const credential = await prisma.credential.findFirst({
    where: { id: credentialId, userId },
  });

  if (!credential) {
    throw new Error("Google Sheets credential not found");
  }

  const decryptedValue = decrypt(credential.value);
  let tokenData: OAuthTokenData;

  try {
    tokenData = JSON.parse(decryptedValue);
  } catch {
    throw new Error("Invalid credential format. Please reconnect your Google Sheets account.");
  }

  if (!tokenData.accessToken) {
    throw new Error("Invalid credential: missing access token. Please reconnect your Google Sheets account.");
  }

  let accessToken = tokenData.accessToken;

  // Check if token is expired or about to expire (within 5 minutes)
  const isExpired = tokenData.tokenExpiry
    ? tokenData.tokenExpiry < Date.now() + 5 * 60 * 1000
    : false;

  if (isExpired && tokenData.refreshToken) {
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
    } catch (refreshError) {
      console.error("[Google Sheets] Failed to refresh token:", refreshError);
      throw new Error("Failed to refresh Google Sheets access token. Please reconnect your account.");
    }
  }

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
// Fetch Sheet Names Action
// =============================================================================

/**
 * Fetches all sheet (tab) names from a Google Spreadsheet.
 * This validates both the credential and spreadsheet ID, and returns available sheets.
 */
export async function fetchSpreadsheetSheets(
  credentialId: string,
  spreadsheetId: string
): Promise<FetchSheetsResult> {
  try {
    // Get the authenticated user
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user?.id) {
      return { success: false, error: "Not authenticated" };
    }

    const userId = session.user.id;

    if (!credentialId) {
      return { success: false, error: "Credential ID is required" };
    }

    if (!spreadsheetId) {
      return { success: false, error: "Spreadsheet ID is required" };
    }

    // Get authenticated Sheets client
    const sheets = await getSheetsClientFromCredential(credentialId, userId);

    // Fetch spreadsheet metadata to get sheet names
    const response = await sheets.spreadsheets.get({
      spreadsheetId: spreadsheetId.trim(),
      fields: "sheets.properties",
    });

    const sheetsData = response.data.sheets || [];

    const sheetInfos: SheetInfo[] = sheetsData
      .map((sheet) => ({
        sheetId: sheet.properties?.sheetId ?? 0,
        title: sheet.properties?.title ?? "Untitled",
        index: sheet.properties?.index ?? 0,
      }))
      .sort((a, b) => a.index - b.index);

    return { success: true, sheets: sheetInfos };
  } catch (error) {
    console.error("[Google Sheets] Failed to fetch sheets:", error);
    
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    
    // Provide user-friendly error messages
    if (errorMessage.includes("404") || errorMessage.includes("not found")) {
      return { 
        success: false, 
        error: "Spreadsheet not found. Please check that the Spreadsheet ID is correct and that you have access to it." 
      };
    }
    
    if (errorMessage.includes("403") || errorMessage.includes("permission")) {
      return { 
        success: false, 
        error: "Permission denied. Please make sure your Google account has access to this spreadsheet." 
      };
    }
    
    if (errorMessage.includes("credential") || errorMessage.includes("token")) {
      return { 
        success: false, 
        error: errorMessage 
      };
    }
    
    return { success: false, error: `Failed to fetch sheets: ${errorMessage}` };
  }
}