import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import prisma from "@/lib/db";
import { encrypt } from "@/lib/encryption";
import { CredentialType } from "@/generated/prisma";

const TOKEN_URL = "https://api.notion.com/v1/oauth/token";

export async function GET(req: NextRequest) {
  console.log("[Notion Callback] Received callback request");
  try {
    const searchParams = req.nextUrl.searchParams;
    const code = searchParams.get("code");
    const state = searchParams.get("state");
    const error = searchParams.get("error");

    console.log("[Notion Callback] Params:", { 
      hasCode: !!code, 
      hasState: !!state, 
      error 
    });

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

    const clientId = process.env.NOTION_CLIENT_ID;
    const clientSecret = process.env.NOTION_CLIENT_SECRET;
    const redirectUri = process.env.NOTION_REDIRECT_URL;

    if (!clientId || !clientSecret || !redirectUri) {
      return NextResponse.redirect(
        new URL("/credentials?error=notion_not_configured", req.url)
      );
    }

    // Exchange code for tokens using Basic Auth
    const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

    const tokenResponse = await fetch(TOKEN_URL, {
      method: "POST",
      headers: {
        "Authorization": `Basic ${basicAuth}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        grant_type: "authorization_code",
        code,
        redirect_uri: redirectUri,
      }),
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.text();
      console.error("Token exchange failed:", errorData);
      console.error("Token exchange details:", {
        status: tokenResponse.status,
        redirectUri,
        codeLength: code?.length,
      });
      return NextResponse.redirect(
        new URL(`/credentials?error=token_exchange_failed&details=${encodeURIComponent(errorData.substring(0, 100))}`, req.url)
      );
    }

    const tokens = await tokenResponse.json();
    console.log("Notion token response keys:", Object.keys(tokens));

    if (!tokens.access_token) {
      console.error("No access_token in response:", tokens);
      return NextResponse.redirect(
        new URL("/credentials?error=no_access_token", req.url)
      );
    }

    // Extract workspace info from token response
    const workspaceName = tokens.workspace_name || "Unknown Workspace";
    const workspaceId = tokens.workspace_id || "";
    const botId = tokens.bot_id || "";

    // Store tokens securely
    // Note: Notion tokens do NOT expire, so no refresh token needed
    const credentialValue = JSON.stringify({
      accessToken: tokens.access_token,
      workspaceId,
      workspaceName,
      botId,
      tokenType: "oauth",
    });

    // Persist credential (create or update)
    try {
      // Check if credential already exists for this user
      const existingCredential = await prisma.credential.findFirst({
        where: {
          userId: session.user.id,
          type: CredentialType.NOTION,
        },
      });

      if (existingCredential) {
        // Update existing credential
        await prisma.credential.update({
          where: { id: existingCredential.id },
          data: {
            value: encrypt(credentialValue),
            name: `Notion (${workspaceName})`,
          },
        });
        console.log("Updated existing Notion credential:", existingCredential.id);
      } else {
        // Create new credential
        const newCred = await prisma.credential.create({
          data: {
            userId: session.user.id,
            type: CredentialType.NOTION,
            name: `Notion (${workspaceName})`,
            value: encrypt(credentialValue),
          },
        });
        console.log("Created new Notion credential:", newCred.id);
      }
    } catch (dbErr) {
      console.error("[Notion Callback] Failed saving credential:", dbErr);
      const reason = dbErr instanceof Error ? dbErr.message : String(dbErr);
      return NextResponse.redirect(
        new URL(`/credentials?error=save_failed&details=${encodeURIComponent(reason.substring(0, 120))}` , req.url)
      );
    }

    // Redirect back to credentials page with success
    console.log("Notion OAuth completed successfully, redirecting...");
    return NextResponse.redirect(
      new URL("/credentials?success=notion_connected", req.url)
    );
  } catch (error) {
    console.error("Error in Notion OAuth callback:", error);
    console.error("Error stack:", error instanceof Error ? error.stack : "No stack");
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.redirect(
      new URL(`/credentials?error=oauth_failed&details=${encodeURIComponent(msg.substring(0, 120))}`, req.url)
    );
  }
}
