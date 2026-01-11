import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

export async function POST(req: NextRequest) {
  try {
    // Get the current user session
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { referralCode } = body;

    if (!referralCode) {
      return NextResponse.json(
        { success: false, error: "Referral code is required" },
        { status: 400 }
      );
    }

    // Find the referrer by code
    const referrer = await prisma.user.findUnique({
      where: { referralCode },
      select: { id: true },
    });

    if (!referrer) {
      return NextResponse.json(
        { success: false, error: "Invalid referral code" },
        { status: 404 }
      );
    }

    // Don't allow self-referral
    if (referrer.id === session.user.id) {
      return NextResponse.json(
        { success: false, error: "Cannot refer yourself" },
        { status: 400 }
      );
    }

    // Check if user is already referred
    const currentUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { referredById: true },
    });

    if (currentUser?.referredById) {
      // Already has a referrer, don't override
      return NextResponse.json({
        success: true,
        message: "User already has a referrer",
      });
    }

    // Update the user with the referrer
    await prisma.user.update({
      where: { id: session.user.id },
      data: { referredById: referrer.id },
    });

    // Update the referral click to mark as converted
    // Find the most recent click from this referrer that isn't converted
    await prisma.referralClick.updateMany({
      where: {
        referrerId: referrer.id,
        convertedToSignup: false,
        convertedUserId: null,
      },
      data: {
        convertedToSignup: true,
        convertedUserId: session.user.id,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Referral attributed successfully",
    });
  } catch (error) {
    console.error("[Referral Attribute] Error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

