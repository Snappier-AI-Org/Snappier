import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { createHash } from "crypto";

// Hash IP for privacy
function hashIP(ip: string): string {
  return createHash("sha256").update(ip).digest("hex").slice(0, 16);
}

export async function POST(req: NextRequest) {
  try {
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

    // Get IP and user agent from request
    const forwardedFor = req.headers.get("x-forwarded-for");
    const ip = forwardedFor ? forwardedFor.split(",")[0].trim() : req.headers.get("x-real-ip");
    const userAgent = req.headers.get("user-agent");
    const referer = req.headers.get("referer");

    // Record the click
    await prisma.referralClick.create({
      data: {
        referrerId: referrer.id,
        ipAddress: ip ? hashIP(ip) : null,
        userAgent: userAgent?.slice(0, 500) || null,
        referer: referer?.slice(0, 500) || null,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[Referral Track] Error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

