import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

const GITHUB_AUTH_URL = "https://github.com/login/oauth/authorize";

export async function GET(req: NextRequest) {
  try {
    // Check if user is authenticated
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const clientId = process.env.GITHUB_NODE_CLIENT_ID;
    const redirectUri = process.env.GITHUB_NODE_REDIRECT_URL;

    if (!clientId || !redirectUri) {
      console.error("GITHUB_NODE_CLIENT_ID or GITHUB_NODE_REDIRECT_URL not configured");
      return NextResponse.json(
        { error: "GitHub integration not configured" },
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

    // GitHub OAuth scopes for common operations
    // - repo: Full control of private repositories
    // - read:user: Read user profile
    // - user:email: Read user email
    // - read:org: Read org info (optional)
    const scopes = ["repo", "read:user", "user:email"].join(" ");

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      scope: scopes,
      state,
    });

    const authUrl = `${GITHUB_AUTH_URL}?${params.toString()}`;

    return NextResponse.redirect(authUrl);
  } catch (error) {
    console.error("Error initiating GitHub OAuth:", error);
    return NextResponse.json(
      { error: "Failed to initiate OAuth" },
      { status: 500 }
    );
  }
}
