import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

const TODOIST_AUTH_URL = "https://todoist.com/oauth/authorize";

export async function GET(req: NextRequest) {
  try {
    // Check if user is authenticated
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const clientId = process.env.TODOIST_CLIENT_ID;
    const redirectUri = process.env.TODOIST_REDIRECT_URL;

    if (!clientId || !redirectUri) {
      console.error("TODOIST_CLIENT_ID or TODOIST_REDIRECT_URL not configured");
      return NextResponse.json(
        { error: "Todoist integration not configured" },
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

    // Todoist OAuth scopes
    // data:read - Read access to tasks, projects, labels, etc.
    // data:read_write - Full access to create, update, delete
    // data:delete - Delete tasks and projects
    // task:add - Quick add tasks (minimal scope)
    const scope = "data:read_write,data:delete";

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      scope,
      state,
    });

    const authUrl = `${TODOIST_AUTH_URL}?${params.toString()}`;

    return NextResponse.redirect(authUrl);
  } catch (error) {
    console.error("Error initiating Todoist OAuth:", error);
    return NextResponse.json(
      { error: "Failed to initiate OAuth" },
      { status: 500 }
    );
  }
}
