import { z } from "zod";
import prisma from "@/lib/db";
import { createTRPCRouter, protectedProcedure, baseProcedure } from "@/trpc/init";
import { createHash, randomBytes } from "crypto";

// Generate a unique referral code
function generateReferralCode(): string {
  return randomBytes(6).toString("base64url").toUpperCase().slice(0, 8);
}

// Hash IP for privacy
function hashIP(ip: string): string {
  return createHash("sha256").update(ip).digest("hex").slice(0, 16);
}

export const referralsRouter = createTRPCRouter({
  // Get current user's referral stats and info
  getStats: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.auth.user.id;

    // Get or create referral code
    let user = await prisma.user.findUnique({
      where: { id: userId },
      select: { referralCode: true },
    });

    if (!user?.referralCode) {
      // Generate and save referral code
      const referralCode = generateReferralCode();
      user = await prisma.user.update({
        where: { id: userId },
        data: { referralCode },
        select: { referralCode: true },
      });
    }

    // Get stats
    const [
      totalClicks,
      uniqueClicks,
      totalSignups,
      totalPaidConversions,
      pendingCommissions,
      approvedCommissions,
      paidCommissions,
      recentClicks,
      recentSignups,
    ] = await Promise.all([
      // Total clicks
      prisma.referralClick.count({
        where: { referrerId: userId },
      }),
      // Unique clicks (by IP)
      prisma.referralClick.groupBy({
        by: ["ipAddress"],
        where: { referrerId: userId, ipAddress: { not: null } },
      }).then((groups) => groups.length),
      // Total signups from referrals
      prisma.user.count({
        where: { referredById: userId },
      }),
      // Total paid conversions (users who subscribed)
      prisma.referralCommission.count({
        where: { referrerId: userId },
      }),
      // Pending commissions
      prisma.referralCommission.aggregate({
        where: { referrerId: userId, status: "PENDING" },
        _sum: { commissionAmount: true },
        _count: true,
      }),
      // Approved commissions
      prisma.referralCommission.aggregate({
        where: { referrerId: userId, status: "APPROVED" },
        _sum: { commissionAmount: true },
        _count: true,
      }),
      // Paid commissions
      prisma.referralCommission.aggregate({
        where: { referrerId: userId, status: "PAID" },
        _sum: { commissionAmount: true },
        _count: true,
      }),
      // Recent clicks (last 7 days)
      prisma.referralClick.findMany({
        where: {
          referrerId: userId,
          createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
        },
        orderBy: { createdAt: "desc" },
        take: 10,
        select: {
          id: true,
          createdAt: true,
          convertedToSignup: true,
          userAgent: true,
        },
      }),
      // Recent signups
      prisma.user.findMany({
        where: { referredById: userId },
        orderBy: { createdAt: "desc" },
        take: 10,
        select: {
          id: true,
          name: true,
          email: true,
          createdAt: true,
        },
      }),
    ]);

    return {
      referralCode: user.referralCode,
      stats: {
        totalClicks,
        uniqueClicks,
        totalSignups,
        totalPaidConversions,
        pendingCommission: pendingCommissions._sum.commissionAmount || 0,
        pendingCount: pendingCommissions._count,
        approvedCommission: approvedCommissions._sum.commissionAmount || 0,
        approvedCount: approvedCommissions._count,
        paidCommission: paidCommissions._sum.commissionAmount || 0,
        paidCount: paidCommissions._count,
        totalEarnings:
          (pendingCommissions._sum.commissionAmount || 0) +
          (approvedCommissions._sum.commissionAmount || 0) +
          (paidCommissions._sum.commissionAmount || 0),
      },
      recentClicks,
      recentSignups: recentSignups.map((user) => ({
        ...user,
        email: user.email.replace(/(.{2})(.*)(@.*)/, "$1***$3"), // Mask email
      })),
    };
  }),

  // Get referral commissions history
  getCommissions: protectedProcedure
    .input(
      z.object({
        status: z.enum(["PENDING", "APPROVED", "PAID", "CANCELLED"]).optional(),
        limit: z.number().min(1).max(100).default(20),
        cursor: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const { status, limit, cursor } = input;

      const commissions = await prisma.referralCommission.findMany({
        where: {
          referrerId: ctx.auth.user.id,
          ...(status && { status }),
        },
        orderBy: { createdAt: "desc" },
        take: limit + 1,
        ...(cursor && { cursor: { id: cursor }, skip: 1 }),
        include: {
          referrer: {
            select: { name: true },
          },
        },
      });

      let nextCursor: string | undefined;
      if (commissions.length > limit) {
        const nextItem = commissions.pop();
        nextCursor = nextItem?.id;
      }

      return {
        commissions,
        nextCursor,
      };
    }),

  // Track a referral click (public endpoint)
  trackClick: baseProcedure
    .input(
      z.object({
        referralCode: z.string(),
        userAgent: z.string().optional(),
        referer: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { referralCode, userAgent, referer } = input;

      // Find the referrer by code
      const referrer = await prisma.user.findUnique({
        where: { referralCode },
        select: { id: true },
      });

      if (!referrer) {
        return { success: false, error: "Invalid referral code" };
      }

      // Get IP from context (will be set by middleware/headers)
      // For now, we'll use a placeholder
      const ipAddress = null; // Would be extracted from request headers

      // Record the click
      await prisma.referralClick.create({
        data: {
          referrerId: referrer.id,
          ipAddress: ipAddress ? hashIP(ipAddress) : null,
          userAgent: userAgent?.slice(0, 500),
          referer: referer?.slice(0, 500),
        },
      });

      return { success: true };
    }),

  // Get referral link for current user
  getReferralLink: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.auth.user.id;

    let user = await prisma.user.findUnique({
      where: { id: userId },
      select: { referralCode: true },
    });

    if (!user?.referralCode) {
      const referralCode = generateReferralCode();
      user = await prisma.user.update({
        where: { id: userId },
        data: { referralCode },
        select: { referralCode: true },
      });
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://snappier.com";
    return {
      referralCode: user.referralCode,
      referralLink: `${baseUrl}/?ref=${user.referralCode}`,
    };
  }),

  // Regenerate referral code
  regenerateCode: protectedProcedure.mutation(async ({ ctx }) => {
    const referralCode = generateReferralCode();

    const user = await prisma.user.update({
      where: { id: ctx.auth.user.id },
      data: { referralCode },
      select: { referralCode: true },
    });

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://snappier.com";
    return {
      referralCode: user.referralCode,
      referralLink: `${baseUrl}/?ref=${user.referralCode}`,
    };
  }),
});

