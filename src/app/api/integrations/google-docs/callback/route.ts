import { NextRequest, NextResponse } from "next/server";
import { google } from "googleapis";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import prisma from "@/lib/db";
import { encrypt } from "@/lib/encryption";
import { CredentialType } from "@/generated/prisma";

function getOAuth2Client() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_DOCS_CLIENT_ID,
    process.env.GOOGLE_DOCS_CLIENT_SECRET,
    process.env.GOOGLE_DOCS_REDIRECT_URL
  );
}

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const code = searchParams.get("code");
    const state = searchParams.get("state");
    const error = searchParams.get("error");

    // Handle OAuth errors
    if (error) {
      console.error("OAuth error:", error);
      return NextResponse.redirect(
        new URL(`/credentials?error=${encodeURIComponent(error)}`, req.url)
      );
    }

    if (!code || !state) {
      return NextResponse.redirect(
        new URL("/credentials?error=missing_params", req.url)
      );
    }

    // Verify state and get user ID
    let stateData: { userId: string; timestamp: number };
    try {
      stateData = JSON.parse(Buffer.from(state, "base64").toString());
    } catch {
      return NextResponse.redirect(
        new URL("/credentials?error=invalid_state", req.url)
      );
    }

    // Verify session matches state
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user?.id || session.user.id !== stateData.userId) {
      return NextResponse.redirect(
        new URL("/credentials?error=session_mismatch", req.url)
      );
    }

    // Exchange code for tokens
    const oauth2Client = getOAuth2Client();
    const { tokens } = await oauth2Client.getToken(code);

    if (!tokens.access_token) {
      return NextResponse.redirect(
        new URL("/credentials?error=no_access_token", req.url)
      );
    }

    // Get user's Google email for identification
    oauth2Client.setCredentials(tokens);
    const oauth2 = google.oauth2({ version: "v2", auth: oauth2Client });
    const userInfo = await oauth2.userinfo.get();
    const googleEmail = userInfo.data.email || "Unknown";

    // Store tokens securely
    const credentialValue = JSON.stringify({
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      tokenExpiry: tokens.expiry_date,
      email: googleEmail,
      tokenType: "oauth",
    });

    // Check if credential already exists for this email
    const existingCredential = await prisma.credential.findFirst({
      where: {
        userId: session.user.id,
        type: CredentialType.GOOGLE_DOCS,
      },
    });

    if (existingCredential) {
      // Update existing credential
      await prisma.credential.update({
        where: { id: existingCredential.id },
        data: {
          value: encrypt(credentialValue),
          name: `Google Docs (${googleEmail})`,
        },
      });
    } else {
      // Create new credential
      await prisma.credential.create({
        data: {
          userId: session.user.id,
          type: CredentialType.GOOGLE_DOCS,
          name: `Google Docs (${googleEmail})`,
          value: encrypt(credentialValue),
        },
      });
    }

    // Redirect back to credentials page with success
    return NextResponse.redirect(
      new URL("/credentials?success=google_docs_connected", req.url)
    );
  } catch (error) {
    console.error("Error in Google Docs OAuth callback:", error);
    return NextResponse.redirect(
      new URL("/credentials?error=oauth_failed", req.url)
    );
  }
}
