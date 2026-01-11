import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import prisma from "@/lib/db";
import { CredentialType } from "@/generated/prisma";
import { decrypt } from "@/lib/encryption";

const REVOKE_URL = "https://api.todoist.com/sync/v9/access_tokens/revoke";

export async function POST(req: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { credentialId } = body;

    if (!credentialId) {
      return NextResponse.json(
        { error: "Credential ID is required" },
        { status: 400 }
      );
    }

    // Find the credential
    const credential = await prisma.credential.findFirst({
      where: {
        id: credentialId,
        userId: session.user.id,
        type: CredentialType.TODOIST,
      },
    });

    if (!credential) {
      return NextResponse.json(
        { error: "Credential not found" },
        { status: 404 }
      );
    }

    // Try to revoke the access token at Todoist
    try {
      const tokenData = JSON.parse(decrypt(credential.value));
      
      if (tokenData.accessToken) {
        const clientId = process.env.TODOIST_CLIENT_ID;
        const clientSecret = process.env.TODOIST_CLIENT_SECRET;

        if (clientId && clientSecret) {
          await fetch(REVOKE_URL, {
            method: "POST",
            headers: {
              "Content-Type": "application/x-www-form-urlencoded",
            },
            body: new URLSearchParams({
              client_id: clientId,
              client_secret: clientSecret,
              access_token: tokenData.accessToken,
            }),
          });
        }
      }
    } catch (revokeError) {
      console.error("Error revoking Todoist token:", revokeError);
      // Continue to delete the credential even if revoke fails
    }

    // Delete the credential from database
    await prisma.credential.delete({
      where: { id: credentialId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error disconnecting Todoist:", error);
    return NextResponse.json(
      { error: "Failed to disconnect Todoist" },
      { status: 500 }
    );
  }
}
