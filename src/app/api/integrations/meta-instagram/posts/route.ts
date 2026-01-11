import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import prisma from "@/lib/db";
import { decrypt } from "@/lib/encryption";
import { getUserPosts, type InstagramCredentials } from "@/features/meta/services/instagram-api";

export async function GET(req: NextRequest) {
  console.log("[Meta Instagram Posts] Fetching user posts");
  
  try {
    // Verify user session
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Get credential ID from query params
    const searchParams = req.nextUrl.searchParams;
    const credentialId = searchParams.get("credentialId");
    const limit = parseInt(searchParams.get("limit") || "25", 10);

    if (!credentialId) {
      return NextResponse.json(
        { error: "Missing credentialId parameter" },
        { status: 400 }
      );
    }

    // Fetch the credential
    const credential = await prisma.credential.findFirst({
      where: {
        id: credentialId,
        userId: session.user.id,
        type: "META_INSTAGRAM",
      },
    });

    if (!credential) {
      return NextResponse.json(
        { error: "Credential not found" },
        { status: 404 }
      );
    }

    // Decrypt credential value
    const decryptedValue = decrypt(credential.value);
    const credentials: InstagramCredentials = JSON.parse(decryptedValue);

    // Fetch user's Instagram posts
    const posts = await getUserPosts(credentials, limit);

    console.log(`[Meta Instagram Posts] Fetched ${posts.length} posts for user ${session.user.id}`);

    return NextResponse.json({
      posts,
      count: posts.length,
    });
  } catch (error) {
    console.error("[Meta Instagram Posts] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch posts" },
      { status: 500 }
    );
  }
}
