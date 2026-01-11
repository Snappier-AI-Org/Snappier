import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import crypto from "crypto";

// Commission rate (10%)
const COMMISSION_RATE = 0.10;

// Verify Polar webhook signature
function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  const hmac = crypto.createHmac("sha256", secret);
  hmac.update(payload);
  const expectedSignature = hmac.digest("hex");
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}

export async function POST(req: NextRequest) {
  try {
    const payload = await req.text();
    const signature = req.headers.get("polar-signature") || req.headers.get("x-polar-signature");
    const webhookSecret = process.env.POLAR_WEBHOOK_SECRET;

    // Verify signature if secret is configured
    if (webhookSecret && signature) {
      const isValid = verifyWebhookSignature(payload, signature, webhookSecret);
      if (!isValid) {
        console.error("[Polar Webhook] Invalid signature");
        return NextResponse.json(
          { error: "Invalid signature" },
          { status: 401 }
        );
      }
    }

    const event = JSON.parse(payload);
    console.log("[Polar Webhook] Received event:", event.type);

    // Handle subscription events
    if (
      event.type === "subscription.created" ||
      event.type === "subscription.active" ||
      event.type === "subscription.updated"
    ) {
      // Polar payloads sometimes nest the subscription differently; normalize
      const subscription =
        event.data?.subscription ??
        event.data?.object ??
        event.data?.data ??
        event.data;

      const customer = subscription?.customer ?? {};
      const customerId =
        customer?.external_id ||
        customer?.id ||
        subscription?.customer_id;

      const subscriptionId = subscription?.id;

      const amount =
        subscription?.recurring_price?.amount ??
        subscription?.price?.price_amount ??
        subscription?.amount ??
        0;

      const currency =
        subscription?.recurring_price?.currency ??
        subscription?.price?.price_currency ??
        subscription?.currency ??
        "USD";

      if (!customerId) {
        console.log("[Polar Webhook] No customer ID in event");
        return NextResponse.json({ received: true });
      }

      // Find the user by their Polar customer ID
      // Better-auth with Polar plugin typically stores this in the user record
      // We'll need to look up the user by their external ID
      const orFilters = [] as { id?: string; email?: string }[];
      if (customerId) orFilters.push({ id: customerId });
      if (customerId) orFilters.push({ email: customerId });
      if (subscription?.customer?.email)
        orFilters.push({ email: subscription.customer.email });

      let user = await prisma.user.findFirst({
        where: {
          OR: orFilters,
        },
        select: {
          id: true,
          referredById: true,
        },
      });

      if (!user) {
        console.log("[Polar Webhook] User not found for customer:", customerId);
        return NextResponse.json({ received: true });
      }

      if (!user.referredById) {
        console.log("[Polar Webhook] User has no referrer:", user.id);
        return NextResponse.json({ received: true });
      }

      // Check if commission already exists for this subscription
      const existingCommission = await prisma.referralCommission.findFirst({
        where: {
          referredUserId: user.id,
          subscriptionId: subscriptionId,
        },
      });

      if (existingCommission) {
        console.log("[Polar Webhook] Commission already exists for subscription:", subscriptionId);
        return NextResponse.json({ received: true });
      }

      // Calculate commission (10% of subscription amount)
      const commissionAmount = Math.floor(amount * COMMISSION_RATE);

      // Create the commission record
      await prisma.referralCommission.create({
        data: {
          referrerId: user.referredById,
          referredUserId: user.id,
          subscriptionAmount: amount,
          commissionRate: COMMISSION_RATE,
          commissionAmount: commissionAmount,
          currency: currency.toUpperCase(),
          status: "PENDING",
          subscriptionId: subscriptionId,
        },
      });

      console.log("[Polar Webhook] Created commission:", {
        referrerId: user.referredById,
        referredUserId: user.id,
        amount: commissionAmount,
      });

      return NextResponse.json({
        received: true,
        commission_created: true,
      });
    }

    // Handle order paid (captures initial payment; some installs use this event)
    if (event.type === "order.paid") {
      const order = event.data;

      const customer = order?.customer ?? {};
      const customerId =
        customer?.external_id ||
        customer?.id ||
        order?.customer_id ||
        order?.user_id;

      const subscription = order?.subscription;
      const subscriptionId = subscription?.id || order?.subscription_id;

      const amount =
        order?.amount ??
        order?.total_amount ??
        order?.net_amount ??
        order?.subtotal_amount ??
        0;

      const currency = order?.currency || "USD";

      if (!customerId) {
        console.log("[Polar Webhook] No customer ID in order.paid event");
        return NextResponse.json({ received: true });
      }

      const orderOrFilters = [] as { id?: string; email?: string }[];
      if (customerId) orderOrFilters.push({ id: customerId });
      if (customerId) orderOrFilters.push({ email: customerId });
      if (customer?.email) orderOrFilters.push({ email: customer.email });

      let user = await prisma.user.findFirst({
        where: {
          OR: orderOrFilters,
        },
        select: {
          id: true,
          referredById: true,
        },
      });

      if (!user) {
        console.log("[Polar Webhook] User not found for order customer:", customerId, customer?.email);
        return NextResponse.json({ received: true });
      }

      if (!user.referredById) {
        console.log("[Polar Webhook] User has no referrer (order.paid):", user.id);
        return NextResponse.json({ received: true });
      }

      const existingCommission = await prisma.referralCommission.findFirst({
        where: {
          referredUserId: user.id,
          subscriptionId: subscriptionId,
        },
      });

      if (existingCommission) {
        console.log("[Polar Webhook] Commission already exists for subscription (order.paid):", subscriptionId);
        return NextResponse.json({ received: true });
      }

      const commissionAmount = Math.floor(amount * COMMISSION_RATE);

      await prisma.referralCommission.create({
        data: {
          referrerId: user.referredById,
          referredUserId: user.id,
          subscriptionAmount: amount,
          commissionRate: COMMISSION_RATE,
          commissionAmount: commissionAmount,
          currency: currency.toUpperCase(),
          status: "PENDING",
          subscriptionId: subscriptionId ?? undefined,
        },
      });

      console.log("[Polar Webhook] Created commission from order.paid:", {
        referrerId: user.referredById,
        referredUserId: user.id,
        amount: commissionAmount,
      });

      return NextResponse.json({ received: true, commission_created: true });
    }

    // Handle subscription cancellation/refund
    if (
      event.type === "subscription.canceled" ||
      event.type === "subscription.revoked"
    ) {
      const subscription = event.data;
      const subscriptionId = subscription.id;

      // Cancel any pending commissions for this subscription
      await prisma.referralCommission.updateMany({
        where: {
          subscriptionId: subscriptionId,
          status: "PENDING",
        },
        data: {
          status: "CANCELLED",
        },
      });

      console.log("[Polar Webhook] Cancelled commissions for subscription:", subscriptionId);

      return NextResponse.json({
        received: true,
        commissions_cancelled: true,
      });
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("[Polar Webhook] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

