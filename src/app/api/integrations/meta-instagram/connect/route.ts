import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

// Meta OAuth authorization URL
const META_AUTH_URL = "https://www.facebook.com/v18.0/dialog/oauth";

export async function GET(req: NextRequest) {
  try {
    // Check if user is authenticated
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const clientId = process.env.META_APP_ID;
    const redirectUri = process.env.META_REDIRECT_URL || `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/integrations/meta-instagram/callback`;

    if (!clientId) {
      console.error("META_APP_ID not configured");
      return NextResponse.json(
        { error: "Meta integration not configured" },
        { status: 500 }
      );
    }

    // Create state with user ID for CSRF protection
    const state = Buffer.from(
      JSON.stringify({
        userId: session.user.id,
        timestamp: Date.now(),
      })
    ).toString("base64");

    // Instagram API scopes required for messaging and comments
    // - instagram_basic: Basic Instagram account info
    // - instagram_manage_comments: Read and respond to comments
    // - instagram_manage_messages: Access Instagram Direct messages
    // - pages_show_list: Required for Instagram Business accounts
    // - pages_read_engagement: Required for page-linked Instagram accounts
    // - business_management: Manage business assets
    const scopes = [
      "instagram_basic",
      "instagram_manage_comments", 
      "instagram_manage_messages",
      "pages_show_list",
      "pages_read_engagement",
      "pages_manage_metadata",
      "business_management",
    ].join(",");

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      scope: scopes,
      response_type: "code",
      state,
    });

    const authUrl = `${META_AUTH_URL}?${params.toString()}`;

    return NextResponse.redirect(authUrl);
  } catch (error) {
    console.error("Error initiating Meta OAuth:", error);
    return NextResponse.json(
      { error: "Failed to initiate OAuth" },
      { status: 500 }
    );
  }
}
