import { sendWorkflowExecution } from "@/inngest/utils";
import { type NextRequest, NextResponse } from "next/server";

function tryParsePayload(rawBody: string, contentType: string | null) {
  if (!rawBody) return null;

  const normalized = (contentType || "").toLowerCase();

  if (normalized.includes("application/json")) {
    try {
      return JSON.parse(rawBody);
    } catch (err) {
      console.warn("[Webhook Trigger] Failed to parse JSON body, falling back to raw string", err);
      return rawBody;
    }
  }

  if (normalized.includes("application/x-www-form-urlencoded")) {
    try {
      return Object.fromEntries(new URLSearchParams(rawBody).entries());
    } catch (err) {
      console.warn("[Webhook Trigger] Failed to parse form body, falling back to raw string", err);
      return rawBody;
    }
  }

  return rawBody;
}

export async function POST(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const workflowId = url.searchParams.get("workflowId");
    const nodeId = url.searchParams.get("nodeId") || undefined;

    if (!workflowId) {
      return NextResponse.json(
        { success: false, error: "Missing required query parameter: workflowId" },
        { status: 400 },
      );
    }

    const secret = process.env.WEBHOOK_TRIGGER_SECRET;
    if (secret) {
      const providedSecret =
        request.headers.get("x-webhook-secret") || request.headers.get("x-webhook-signature");

      if (providedSecret !== secret) {
        return NextResponse.json(
          { success: false, error: "Invalid or missing webhook secret" },
          { status: 401 },
        );
      }
    }

    const rawBody = await request.text();
    const payload = tryParsePayload(rawBody, request.headers.get("content-type"));

    // Generate a deduplication key from the payload
    // Zalo sends message_id, other services may have their own unique identifiers
    let deduplicationKey = `webhook:${workflowId}:`;
    
    if (payload && typeof payload === "object") {
      // Try common unique identifier fields from various webhook providers
      const uniqueId = 
        payload.message_id ||                           // Zalo Bot
        payload.message?.message_id ||                  // Zalo Bot nested
        payload.update_id ||                            // Telegram
        payload.entry?.[0]?.messaging?.[0]?.message?.mid || // Facebook/Instagram
        payload.id ||                                   // Generic
        payload.event_id ||                             // Generic
        payload.request_id;                             // Generic
      
      if (uniqueId) {
        deduplicationKey += String(uniqueId);
        console.log(`[Webhook Trigger] Using unique ID for deduplication: ${uniqueId}`);
      } else {
        // Fallback: use a hash of the raw body
        // Create a simple hash from the raw body
        const hash = rawBody.split('').reduce((a, b) => {
          a = ((a << 5) - a) + b.charCodeAt(0);
          return a & a;
        }, 0);
        deduplicationKey += `hash:${Math.abs(hash)}`;
        console.log(`[Webhook Trigger] Using body hash for deduplication: ${hash}`);
      }
    } else {
      const hash = rawBody.split('').reduce((a, b) => {
        a = ((a << 5) - a) + b.charCodeAt(0);
        return a & a;
      }, 0);
      deduplicationKey += `hash:${Math.abs(hash)}`;
    }

    console.log(`[Webhook Trigger] Deduplication key: ${deduplicationKey}`);

    const query = Object.fromEntries(
      Array.from(url.searchParams.entries()).filter(([key]) => key !== "workflowId" && key !== "nodeId"),
    );

    await sendWorkflowExecution({
      workflowId,
      deduplicationKey,
      initialData: {
        webhook: {
          nodeId,
          payload,
          query,
          headers: Object.fromEntries(request.headers.entries()),
          rawBody,
        },
      },
    });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("[Webhook Trigger] Error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to process webhook" },
      { status: 500 },
    );
  }
}
