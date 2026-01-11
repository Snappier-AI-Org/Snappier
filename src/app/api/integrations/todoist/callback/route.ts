import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import prisma from "@/lib/db";
import { encrypt } from "@/lib/encryption";
import { CredentialType } from "@/generated/prisma";

const TOKEN_URL = "https://todoist.com/oauth/access_token";

export async function GET(req: NextRequest) {
  console.log("[Todoist Callback] Received callback request");
  try {
    const searchParams = req.nextUrl.searchParams;
    const code = searchParams.get("code");
    const state = searchParams.get("state");
    const error = searchParams.get("error");

    console.log("[Todoist Callback] Params:", { 
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

    const clientId = process.env.TODOIST_CLIENT_ID;
    const clientSecret = process.env.TODOIST_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      return NextResponse.redirect(
        new URL("/credentials?error=todoist_not_configured", req.url)
      );
    }

    // Exchange code for access token
    const tokenResponse = await fetch(TOKEN_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        code,
      }),
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.text();
      console.error("Token exchange failed:", errorData);
      console.error("Token exchange details:", {
        status: tokenResponse.status,
        codeLength: code?.length,
      });
      return NextResponse.redirect(
        new URL(`/credentials?error=token_exchange_failed&details=${encodeURIComponent(errorData.substring(0, 100))}`, req.url)
      );
    }

    const tokens = await tokenResponse.json();
    console.log("Todoist token response keys:", Object.keys(tokens));

    // Todoist returns: access_token, token_type
    // Note: Todoist access tokens do not expire (no refresh token needed)

    // Fetch user info to get a meaningful credential name
    let credentialName = "Todoist";
    try {
      const userResponse = await fetch("https://api.todoist.com/sync/v9/sync", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${tokens.access_token}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          sync_token: "*",
          resource_types: '["user"]',
        }),
      });

      if (userResponse.ok) {
        const userData = await userResponse.json();
        if (userData.user?.full_name) {
          credentialName = `Todoist - ${userData.user.full_name}`;
        } else if (userData.user?.email) {
          credentialName = `Todoist - ${userData.user.email}`;
        }
      }
    } catch (userError) {
      console.error("Error fetching Todoist user info:", userError);
      // Continue with default name
    }

    // Store the access token
    const tokenData = {
      accessToken: tokens.access_token,
      tokenType: tokens.token_type || "Bearer",
    };

    const encryptedValue = encrypt(JSON.stringify(tokenData));

    // Check if credential already exists
    const existingCredential = await prisma.credential.findFirst({
      where: {
        userId: session.user.id,
        type: CredentialType.TODOIST,
      },
    });

    if (existingCredential) {
      // Update existing credential
      await prisma.credential.update({
        where: { id: existingCredential.id },
        data: {
          name: credentialName,
          value: encryptedValue,
          updatedAt: new Date(),
        },
      });
      console.log("[Todoist Callback] Updated existing credential");
    } else {
      // Create new credential
      await prisma.credential.create({
        data: {
          name: credentialName,
          type: CredentialType.TODOIST,
          value: encryptedValue,
          userId: session.user.id,
        },
      });
      console.log("[Todoist Callback] Created new credential");
    }

    return NextResponse.redirect(
      new URL("/credentials?success=todoist_connected", req.url)
    );
  } catch (error) {
    console.error("Error in Todoist callback:", error);
    return NextResponse.redirect(
      new URL("/credentials?error=callback_failed", req.url)
    );
  }
}
