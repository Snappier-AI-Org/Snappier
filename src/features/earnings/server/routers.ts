import { z } from "zod";
import prisma from "@/lib/db";
import { createTRPCRouter, protectedProcedure } from "@/trpc/init";

// Platform fee rate (10% - you can adjust this)
const PLATFORM_FEE_RATE = 0.10;

// Minimum withdrawal amount in cents ($10)
const MIN_WITHDRAWAL_AMOUNT = 1000;

export const earningsRouter = createTRPCRouter({
  // Get user's earnings overview (wallet balance)
  getWalletBalance: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.auth.user.id;

    // Get referral commissions
    const [
      pendingReferralCommissions,
      availableReferralCommissions,
      withdrawnReferralCommissions,
    ] = await Promise.all([
      prisma.referralCommission.aggregate({
        where: { referrerId: userId, status: "PENDING" },
        _sum: { commissionAmount: true },
        _count: true,
      }),
      prisma.referralCommission.aggregate({
        where: { referrerId: userId, status: "APPROVED" },
        _sum: { commissionAmount: true },
        _count: true,
      }),
      prisma.referralCommission.aggregate({
        where: { referrerId: userId, status: "PAID" },
        _sum: { commissionAmount: true },
        _count: true,
      }),
    ]);

    // Get template earnings
    const [
      pendingTemplateEarnings,
      availableTemplateEarnings,
      withdrawnTemplateEarnings,
    ] = await Promise.all([
      prisma.templateEarning.aggregate({
        where: { sellerId: userId, status: "PENDING" },
        _sum: { netEarning: true },
        _count: true,
      }),
      prisma.templateEarning.aggregate({
        where: { sellerId: userId, status: "AVAILABLE" },
        _sum: { netEarning: true },
        _count: true,
      }),
      prisma.templateEarning.aggregate({
        where: { sellerId: userId, status: "WITHDRAWN" },
        _sum: { netEarning: true },
        _count: true,
      }),
    ]);

    // Get pending payout requests
    const pendingPayouts = await prisma.payoutRequest.aggregate({
      where: { userId, status: { in: ["PENDING", "APPROVED", "PROCESSING"] } },
      _sum: { amount: true },
      _count: true,
    });

    const referralPending = pendingReferralCommissions._sum.commissionAmount || 0;
    const referralAvailable = availableReferralCommissions._sum.commissionAmount || 0;
    const referralWithdrawn = withdrawnReferralCommissions._sum.commissionAmount || 0;

    const templatePending = pendingTemplateEarnings._sum.netEarning || 0;
    const templateAvailable = availableTemplateEarnings._sum.netEarning || 0;
    const templateWithdrawn = withdrawnTemplateEarnings._sum.netEarning || 0;

    const totalAvailable = referralAvailable + templateAvailable;
    const totalPending = referralPending + templatePending;
    const totalWithdrawn = referralWithdrawn + templateWithdrawn;
    const pendingPayoutAmount = pendingPayouts._sum.amount || 0;

    return {
      referral: {
        pending: referralPending,
        available: referralAvailable,
        withdrawn: referralWithdrawn,
        pendingCount: pendingReferralCommissions._count,
        availableCount: availableReferralCommissions._count,
      },
      template: {
        pending: templatePending,
        available: templateAvailable,
        withdrawn: templateWithdrawn,
        pendingCount: pendingTemplateEarnings._count,
        availableCount: availableTemplateEarnings._count,
      },
      totals: {
        available: totalAvailable,
        pending: totalPending,
        withdrawn: totalWithdrawn,
        pendingPayout: pendingPayoutAmount,
        withdrawable: totalAvailable - pendingPayoutAmount,
      },
      minimumWithdrawal: MIN_WITHDRAWAL_AMOUNT,
    };
  }),

  // Get earnings history
  getEarningsHistory: protectedProcedure
    .input(
      z.object({
        type: z.enum(["all", "referral", "template"]).default("all"),
        limit: z.number().min(1).max(100).default(20),
        cursor: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const userId = ctx.auth.user.id;
      const { type, limit } = input;

      // Get combined earnings
      const earnings: Array<{
        id: string;
        type: "referral" | "template";
        amount: number;
        status: string;
        description: string;
        createdAt: Date;
      }> = [];

      if (type === "all" || type === "referral") {
        const referralCommissions = await prisma.referralCommission.findMany({
          where: { referrerId: userId },
          orderBy: { createdAt: "desc" },
          take: limit,
        });

        referralCommissions.forEach((c) => {
          earnings.push({
            id: c.id,
            type: "referral",
            amount: c.commissionAmount,
            status: c.status,
            description: "Referral commission",
            createdAt: c.createdAt,
          });
        });
      }

      if (type === "all" || type === "template") {
        const templateEarnings = await prisma.templateEarning.findMany({
          where: { sellerId: userId },
          orderBy: { createdAt: "desc" },
          take: limit,
        });

        templateEarnings.forEach((e) => {
          earnings.push({
            id: e.id,
            type: "template",
            amount: e.netEarning,
            status: e.status,
            description: "Template sale",
            createdAt: e.createdAt,
          });
        });
      }

      // Sort by date
      earnings.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

      return {
        earnings: earnings.slice(0, limit),
      };
    }),

  // Get payout history
  getPayoutHistory: protectedProcedure
    .input(
      z.object({
        status: z.enum(["PENDING", "APPROVED", "PROCESSING", "COMPLETED", "REJECTED", "CANCELLED"]).optional(),
        limit: z.number().min(1).max(100).default(20),
      })
    )
    .query(async ({ ctx, input }) => {
      const { status, limit } = input;

      const payouts = await prisma.payoutRequest.findMany({
        where: {
          userId: ctx.auth.user.id,
          ...(status && { status }),
        },
        orderBy: { createdAt: "desc" },
        take: limit,
      });

      return { payouts };
    }),

  // Request a payout/withdrawal
  requestPayout: protectedProcedure
    .input(
      z.object({
        amount: z.number().min(MIN_WITHDRAWAL_AMOUNT),
        method: z.enum(["PAYPAL", "BANK_TRANSFER", "WISE", "CRYPTO", "OTHER"]),
        payoutDetails: z.object({
          email: z.string().email().optional(),
          accountNumber: z.string().optional(),
          bankName: z.string().optional(),
          routingNumber: z.string().optional(),
          walletAddress: z.string().optional(),
          notes: z.string().optional(),
        }),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.auth.user.id;
      const { amount, method, payoutDetails } = input;

      // Get available balance
      const [referralBalance, templateBalance, pendingPayouts] = await Promise.all([
        prisma.referralCommission.aggregate({
          where: { referrerId: userId, status: "APPROVED" },
          _sum: { commissionAmount: true },
        }),
        prisma.templateEarning.aggregate({
          where: { sellerId: userId, status: "AVAILABLE" },
          _sum: { netEarning: true },
        }),
        prisma.payoutRequest.aggregate({
          where: { userId, status: { in: ["PENDING", "APPROVED", "PROCESSING"] } },
          _sum: { amount: true },
        }),
      ]);

      const availableReferral = referralBalance._sum.commissionAmount || 0;
      const availableTemplate = templateBalance._sum.netEarning || 0;
      const pendingPayoutAmount = pendingPayouts._sum.amount || 0;
      const withdrawable = availableReferral + availableTemplate - pendingPayoutAmount;

      if (amount > withdrawable) {
        throw new Error(`Insufficient balance. Available: $${(withdrawable / 100).toFixed(2)}`);
      }

      if (amount < MIN_WITHDRAWAL_AMOUNT) {
        throw new Error(`Minimum withdrawal amount is $${(MIN_WITHDRAWAL_AMOUNT / 100).toFixed(2)}`);
      }

      // Get IDs of earnings to include in this payout
      // Start with referral commissions
      let remainingAmount = amount;
      const referralIds: string[] = [];
      const earningIds: string[] = [];

      // Get available referral commissions
      if (remainingAmount > 0) {
        const availableCommissions = await prisma.referralCommission.findMany({
          where: { referrerId: userId, status: "APPROVED" },
          orderBy: { createdAt: "asc" },
        });

        for (const commission of availableCommissions) {
          if (remainingAmount <= 0) break;
          referralIds.push(commission.id);
          remainingAmount -= commission.commissionAmount;
        }
      }

      // Get available template earnings
      if (remainingAmount > 0) {
        const availableEarnings = await prisma.templateEarning.findMany({
          where: { sellerId: userId, status: "AVAILABLE" },
          orderBy: { createdAt: "asc" },
        });

        for (const earning of availableEarnings) {
          if (remainingAmount <= 0) break;
          earningIds.push(earning.id);
          remainingAmount -= earning.netEarning;
        }
      }

      // Create payout request
      const payout = await prisma.payoutRequest.create({
        data: {
          userId,
          amount,
          method,
          payoutDetails,
          referralIds,
          earningIds,
          status: "PENDING",
        },
      });

      return {
        success: true,
        payout,
        message: `Withdrawal request for $${(amount / 100).toFixed(2)} submitted successfully. We'll process it within 3-5 business days.`,
      };
    }),

  // Cancel a pending payout request
  cancelPayout: protectedProcedure
    .input(z.object({ payoutId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const payout = await prisma.payoutRequest.findFirst({
        where: {
          id: input.payoutId,
          userId: ctx.auth.user.id,
          status: "PENDING",
        },
      });

      if (!payout) {
        throw new Error("Payout request not found or cannot be cancelled");
      }

      await prisma.payoutRequest.update({
        where: { id: input.payoutId },
        data: { status: "CANCELLED" },
      });

      return { success: true, message: "Payout request cancelled" };
    }),

  // Create template earning when a template is purchased
  // This is called internally when a purchase is completed
  createTemplateEarning: protectedProcedure
    .input(
      z.object({
        templateId: z.string(),
        purchaseId: z.string(),
        saleAmount: z.number(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { templateId, purchaseId, saleAmount } = input;

      // Get template to find seller
      const template = await prisma.template.findUnique({
        where: { id: templateId },
        select: { userId: true },
      });

      if (!template) {
        throw new Error("Template not found");
      }

      // Don't create earning if buyer is the seller
      if (template.userId === ctx.auth.user.id) {
        return { success: false, message: "Cannot earn from own template" };
      }

      // Calculate fees
      const platformFee = Math.floor(saleAmount * PLATFORM_FEE_RATE);
      const netEarning = saleAmount - platformFee;

      // Create earning record
      const earning = await prisma.templateEarning.create({
        data: {
          sellerId: template.userId,
          templateId,
          purchaseId,
          saleAmount,
          platformFee,
          netEarning,
          status: "AVAILABLE", // Immediately available (or use PENDING with a hold period)
        },
      });

      // Update the purchase with earning reference
      await prisma.templatePurchase.update({
        where: { id: purchaseId },
        data: { earningId: earning.id },
      });

      return { success: true, earning };
    }),
});

