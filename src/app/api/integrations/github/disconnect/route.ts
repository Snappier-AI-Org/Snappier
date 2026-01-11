import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import prisma from "@/lib/db";
import { CredentialType } from "@/generated/prisma";

export async function DELETE(req: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const credentialId = searchParams.get("credentialId");

    if (!credentialId) {
      return NextResponse.json(
        { error: "Credential ID required" },
        { status: 400 }
      );
    }

    // Verify the credential belongs to the user and is a GitHub credential
    const credential = await prisma.credential.findFirst({
      where: {
        id: credentialId,
        userId: session.user.id,
        type: CredentialType.GITHUB,
      },
    });

    if (!credential) {
      return NextResponse.json(
        { error: "Credential not found" },
        { status: 404 }
      );
    }

    // Delete the credential
    // Note: To fully revoke the token, user should also revoke it in GitHub Settings > Applications
    await prisma.credential.delete({
      where: { id: credentialId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error disconnecting GitHub:", error);
    return NextResponse.json(
      { error: "Failed to disconnect" },
      { status: 500 }
    );
  }
}
