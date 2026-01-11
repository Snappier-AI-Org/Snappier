import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import prisma from "@/lib/db";
import { encrypt } from "@/lib/encryption";
import { CredentialType } from "@/generated/prisma";

const TOKEN_URL = "https://github.com/login/oauth/access_token";
const USER_API_URL = "https://api.github.com/user";

export async function GET(req: NextRequest) {
  console.log("[GitHub Callback] Received callback request");
  try {
    const searchParams = req.nextUrl.searchParams;
    const code = searchParams.get("code");
    const state = searchParams.get("state");
    const error = searchParams.get("error");
    const errorDescription = searchParams.get("error_description");

    console.log("[GitHub Callback] Params:", { 
      hasCode: !!code, 
      hasState: !!state, 
      error 
    });

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

    const clientId = process.env.GITHUB_NODE_CLIENT_ID;
    const clientSecret = process.env.GITHUB_NODE_CLIENT_SECRET;
    const redirectUri = process.env.GITHUB_NODE_REDIRECT_URL;

    if (!clientId || !clientSecret || !redirectUri) {
      return NextResponse.redirect(
        new URL("/credentials?error=github_not_configured", req.url)
      );
    }

    // Exchange code for access token
    const tokenResponse = await fetch(TOKEN_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
      },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        redirect_uri: redirectUri,
      }),
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.text();
      console.error("Token exchange failed:", errorData);
      return NextResponse.redirect(
        new URL(`/credentials?error=token_exchange_failed&details=${encodeURIComponent(errorData.substring(0, 100))}`, req.url)
      );
    }

    const tokens = await tokenResponse.json();
    console.log("GitHub token response keys:", Object.keys(tokens));

    if (tokens.error) {
      console.error("GitHub OAuth error:", tokens.error, tokens.error_description);
      return NextResponse.redirect(
        new URL(`/credentials?error=${encodeURIComponent(tokens.error)}`, req.url)
      );
    }

    if (!tokens.access_token) {
      console.error("No access_token in response:", tokens);
      return NextResponse.redirect(
        new URL("/credentials?error=no_access_token", req.url)
      );
    }

    // Fetch user info to get username for display
    const userResponse = await fetch(USER_API_URL, {
      headers: {
        "Authorization": `Bearer ${tokens.access_token}`,
        "Accept": "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
    });

    let username = "Unknown User";
    if (userResponse.ok) {
      const userData = await userResponse.json();
      username = userData.login || userData.name || "Unknown User";
    }

    // Store tokens securely
    // Note: GitHub tokens don't expire unless revoked
    const credentialValue = JSON.stringify({
      accessToken: tokens.access_token,
      tokenType: tokens.token_type || "bearer",
      scope: tokens.scope,
      username,
    });

    // Persist credential (create or update)
    try {
      // Check if credential already exists for this user
      const existingCredential = await prisma.credential.findFirst({
        where: {
          userId: session.user.id,
          type: CredentialType.GITHUB,
        },
      });

      if (existingCredential) {
        // Update existing credential
        await prisma.credential.update({
          where: { id: existingCredential.id },
          data: {
            value: encrypt(credentialValue),
            name: `GitHub (${username})`,
          },
        });
        console.log("Updated existing GitHub credential:", existingCredential.id);
      } else {
        // Create new credential
        const newCred = await prisma.credential.create({
          data: {
            userId: session.user.id,
            type: CredentialType.GITHUB,
            name: `GitHub (${username})`,
            value: encrypt(credentialValue),
          },
        });
        console.log("Created new GitHub credential:", newCred.id);
      }
    } catch (dbErr) {
      console.error("[GitHub Callback] Failed saving credential:", dbErr);
      const reason = dbErr instanceof Error ? dbErr.message : String(dbErr);
      return NextResponse.redirect(
        new URL(`/credentials?error=save_failed&details=${encodeURIComponent(reason.substring(0, 120))}` , req.url)
      );
    }

    // Redirect back to credentials page with success
    console.log("GitHub OAuth completed successfully, redirecting...");
    return NextResponse.redirect(
      new URL("/credentials?success=github_connected", req.url)
    );
  } catch (error) {
    console.error("Error in GitHub OAuth callback:", error);
    console.error("Error stack:", error instanceof Error ? error.stack : "No stack");
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.redirect(
      new URL(`/credentials?error=oauth_failed&details=${encodeURIComponent(msg.substring(0, 120))}`, req.url)
    );
  }
}
