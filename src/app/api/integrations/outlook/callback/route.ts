import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import prisma from "@/lib/db";
import { encrypt } from "@/lib/encryption";
import { CredentialType } from "@/generated/prisma";

const TOKEN_URL = "https://login.microsoftonline.com/common/oauth2/v2.0/token";
const GRAPH_API_URL = "https://graph.microsoft.com/v1.0";

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const code = searchParams.get("code");
    const state = searchParams.get("state");
    const error = searchParams.get("error");
    const errorDescription = searchParams.get("error_description");

    // Handle OAuth errors
    if (error) {
      console.error("OAuth error:", error, errorDescription);
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

    const clientId = process.env.OUTLOOK_CLIENT_ID;
    const clientSecret = process.env.OUTLOOK_CLIENT_SECRET;
    const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/integrations/outlook/callback`;

    if (!clientId || !clientSecret) {
      return NextResponse.redirect(
        new URL("/credentials?error=outlook_not_configured", req.url)
      );
    }

    // Exchange code for tokens
    const tokenResponse = await fetch(TOKEN_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.text();
      console.error("Token exchange failed:", errorData);
      return NextResponse.redirect(
        new URL("/credentials?error=token_exchange_failed", req.url)
      );
    }

    const tokens = await tokenResponse.json();

    if (!tokens.access_token) {
      return NextResponse.redirect(
        new URL("/credentials?error=no_access_token", req.url)
      );
    }

    // Get user's Microsoft email for identification
    const userInfoResponse = await fetch(`${GRAPH_API_URL}/me`, {
      headers: {
        Authorization: `Bearer ${tokens.access_token}`,
      },
    });

    let outlookEmail = "Unknown";
    if (userInfoResponse.ok) {
      const userInfo = await userInfoResponse.json();
      outlookEmail = userInfo.mail || userInfo.userPrincipalName || "Unknown";
    }

    // Store tokens securely
    const credentialValue = JSON.stringify({
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      tokenExpiry: Date.now() + (tokens.expires_in * 1000),
      email: outlookEmail,
      tokenType: "oauth",
    });

    // Check if credential already exists for this user
    const existingCredential = await prisma.credential.findFirst({
      where: {
        userId: session.user.id,
        type: CredentialType.OUTLOOK,
      },
    });

    if (existingCredential) {
      // Update existing credential
      await prisma.credential.update({
        where: { id: existingCredential.id },
        data: {
          value: encrypt(credentialValue),
          name: `Outlook (${outlookEmail})`,
        },
      });
    } else {
      // Create new credential
      await prisma.credential.create({
        data: {
          userId: session.user.id,
          type: CredentialType.OUTLOOK,
          name: `Outlook (${outlookEmail})`,
          value: encrypt(credentialValue),
        },
      });
    }

    // Redirect back to credentials page with success
    return NextResponse.redirect(
      new URL("/credentials?success=outlook_connected", req.url)
    );
  } catch (error) {
    console.error("Error in Outlook OAuth callback:", error);
    return NextResponse.redirect(
      new URL("/credentials?error=oauth_failed", req.url)
    );
  }
}
