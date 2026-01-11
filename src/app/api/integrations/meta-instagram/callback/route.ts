import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import prisma from "@/lib/db";
import { encrypt } from "@/lib/encryption";
import { CredentialType } from "@/generated/prisma";

const TOKEN_URL = "https://graph.facebook.com/v18.0/oauth/access_token";
const GRAPH_API_URL = "https://graph.facebook.com/v18.0";

export async function GET(req: NextRequest) {
  console.log("[Meta Instagram Callback] Received callback request");
  try {
    const searchParams = req.nextUrl.searchParams;
    const code = searchParams.get("code");
    const state = searchParams.get("state");
    const error = searchParams.get("error");
    const errorReason = searchParams.get("error_reason");
    const errorDescription = searchParams.get("error_description");

    console.log("[Meta Instagram Callback] Params:", {
      hasCode: !!code,
      hasState: !!state,
      error,
    });

    // Handle OAuth errors
    if (error) {
      console.error("OAuth error:", error, errorReason, errorDescription);
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

    const clientId = process.env.META_APP_ID;
    const clientSecret = process.env.META_APP_SECRET;
    const redirectUri = process.env.META_REDIRECT_URL || `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/integrations/meta-instagram/callback`;

    if (!clientId || !clientSecret) {
      return NextResponse.redirect(
        new URL("/credentials?error=meta_not_configured", req.url)
      );
    }

    // Exchange code for short-lived access token
    const tokenParams = new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      code,
    });

    const tokenResponse = await fetch(`${TOKEN_URL}?${tokenParams.toString()}`, {
      method: "GET",
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.text();
      console.error("Token exchange failed:", errorData);
      return NextResponse.redirect(
        new URL(`/credentials?error=token_exchange_failed&details=${encodeURIComponent(errorData.substring(0, 100))}`, req.url)
      );
    }

    const shortLivedTokens = await tokenResponse.json();
    console.log("Meta short-lived token response keys:", Object.keys(shortLivedTokens));

    if (shortLivedTokens.error) {
      console.error("Meta OAuth error:", shortLivedTokens.error);
      return NextResponse.redirect(
        new URL(`/credentials?error=${encodeURIComponent(shortLivedTokens.error.message || shortLivedTokens.error)}`, req.url)
      );
    }

    if (!shortLivedTokens.access_token) {
      console.error("No access_token in response:", shortLivedTokens);
      return NextResponse.redirect(
        new URL("/credentials?error=no_access_token", req.url)
      );
    }

    // Exchange short-lived token for long-lived token (valid for ~60 days)
    const longLivedParams = new URLSearchParams({
      grant_type: "fb_exchange_token",
      client_id: clientId,
      client_secret: clientSecret,
      fb_exchange_token: shortLivedTokens.access_token,
    });

    const longLivedResponse = await fetch(`${TOKEN_URL}?${longLivedParams.toString()}`, {
      method: "GET",
    });

    let accessToken = shortLivedTokens.access_token;
    let tokenExpiry = Date.now() + (shortLivedTokens.expires_in ? shortLivedTokens.expires_in * 1000 : 3600000);

    if (longLivedResponse.ok) {
      const longLivedTokens = await longLivedResponse.json();
      if (longLivedTokens.access_token) {
        accessToken = longLivedTokens.access_token;
        tokenExpiry = Date.now() + (longLivedTokens.expires_in ? longLivedTokens.expires_in * 1000 : 5184000000); // 60 days default
        console.log("Successfully obtained long-lived token");
      }
    }

    // Get user's Facebook pages to find linked Instagram accounts
    const pagesResponse = await fetch(
      `${GRAPH_API_URL}/me/accounts?fields=id,name,instagram_business_account{id,name,username}&access_token=${accessToken}`
    );

    let instagramAccountId = "";
    let instagramUsername = "";
    let pageId = "";
    let pageName = "";
    let pageAccessToken = accessToken;

    if (pagesResponse.ok) {
      const pagesData = await pagesResponse.json();
      console.log("Pages data:", JSON.stringify(pagesData, null, 2));

      // Find the first page with an Instagram Business account
      for (const page of pagesData.data || []) {
        if (page.instagram_business_account) {
          instagramAccountId = page.instagram_business_account.id;
          instagramUsername = page.instagram_business_account.username || page.instagram_business_account.name || "Unknown";
          pageId = page.id;
          pageName = page.name;
          
          // Get page access token for API calls
          const pageTokenResponse = await fetch(
            `${GRAPH_API_URL}/${page.id}?fields=access_token&access_token=${accessToken}`
          );
          if (pageTokenResponse.ok) {
            const pageTokenData = await pageTokenResponse.json();
            if (pageTokenData.access_token) {
              pageAccessToken = pageTokenData.access_token;
            }
          }
          break;
        }
      }
    }

    if (!instagramAccountId) {
      console.warn("No Instagram Business account found linked to any Facebook page");
      // Still save the credentials - user might link Instagram later
    }

    // Store tokens securely
    const credentialValue = JSON.stringify({
      accessToken: pageAccessToken,
      userAccessToken: accessToken,
      tokenExpiry,
      instagramAccountId,
      instagramUsername,
      pageId,
      pageName,
      tokenType: "oauth",
    });

    // Persist credential (create or update)
    try {
      const existingCredential = await prisma.credential.findFirst({
        where: {
          userId: session.user.id,
          type: CredentialType.META_INSTAGRAM,
        },
      });

      const credentialName = instagramUsername 
        ? `Instagram (@${instagramUsername})`
        : `Meta/Instagram (${pageName || "Not Linked"})`;

      if (existingCredential) {
        await prisma.credential.update({
          where: { id: existingCredential.id },
          data: {
            value: encrypt(credentialValue),
            name: credentialName,
          },
        });
        console.log("Updated existing Meta Instagram credential:", existingCredential.id);
      } else {
        const newCred = await prisma.credential.create({
          data: {
            userId: session.user.id,
            type: CredentialType.META_INSTAGRAM,
            name: credentialName,
            value: encrypt(credentialValue),
          },
        });
        console.log("Created new Meta Instagram credential:", newCred.id);
      }
    } catch (dbErr) {
      console.error("[Meta Instagram Callback] Failed saving credential:", dbErr);
      const reason = dbErr instanceof Error ? dbErr.message : String(dbErr);
      return NextResponse.redirect(
        new URL(`/credentials?error=save_failed&details=${encodeURIComponent(reason.substring(0, 120))}`, req.url)
      );
    }

    // Redirect back to credentials page with success
    console.log("Meta Instagram OAuth completed successfully, redirecting...");
    return NextResponse.redirect(
      new URL("/credentials?success=meta_instagram_connected", req.url)
    );
  } catch (error) {
    console.error("Error in Meta Instagram OAuth callback:", error);
    console.error("Error stack:", error instanceof Error ? error.stack : "No stack");
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.redirect(
      new URL(`/credentials?error=oauth_failed&details=${encodeURIComponent(msg.substring(0, 120))}`, req.url)
    );
  }
}
