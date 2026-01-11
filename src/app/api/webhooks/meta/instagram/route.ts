import { sendWorkflowExecution } from "@/inngest/utils";
import { type NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { decrypt } from "@/lib/encryption";
import {
  verifyWebhookSignature,
  parseMessagingWebhook,
  parseCommentWebhook,
  matchesKeywords,
  type InstagramMessageEvent,
  type InstagramCommentEvent,
} from "@/features/meta/services/instagram-api";
import { saveUserMessage } from "@/features/meta/services/conversation-manager";

// Configure Next.js route behavior
export const runtime = 'nodejs'; // Use Node.js runtime for better compatibility
export const dynamic = 'force-dynamic'; // Don't cache webhook responses

type MetaWebhookPayload = {
  object: "instagram";
  entry: Array<{
    id: string;
    time: number;
    messaging?: Array<{
      sender: { id: string };
      recipient: { id: string };
      timestamp: number;
      message?: {
        mid: string;
        text: string;
      };
    }>;
    changes?: Array<{
      field: string;
      value: {
        id: string;
        text: string;
        from: {
          id: string;
          username?: string;
        };
        media: {
          id: string;
        };
        parent_id?: string;
      };
    }>;
  }>;
};

type InstagramCredentialValue = {
  accessToken: string;
  pageId: string;
  instagramAccountId: string;
};

// Legacy trigger node data (for INSTAGRAM_DM_TRIGGER and INSTAGRAM_COMMENT_TRIGGER)
type LegacyTriggerNodeData = {
  credentialId?: string;
  keywords?: string[];
  keywordMatchMode?: "any" | "all" | "exact";
  postId?: string;
};

// Combined trigger node data (for INSTAGRAM_TRIGGER)
type CombinedTriggerNodeData = {
  credentialId?: string;
  triggerType?: "dm" | "comment" | "both";
  // DM-specific options
  dmKeywords?: string[];
  dmKeywordMatchMode?: "any" | "all" | "exact";
  // Comment-specific options
  postId?: string;
  commentKeywords?: string[];
  commentKeywordMatchMode?: "any" | "all" | "exact";
};

type TriggerNodeData = LegacyTriggerNodeData | CombinedTriggerNodeData;

/**
 * Process Instagram DM events and trigger workflows
 */
async function processInstagramDM(event: InstagramMessageEvent) {
  console.log("[Meta Instagram Webhook] Processing DM:", {
    senderId: event.senderId,
    messageId: event.messageId,
    textLength: event.messageText?.length,
  });

  // Find all workflows with DM-compatible trigger nodes
  // This includes: INSTAGRAM_TRIGGER (with triggerType 'dm' or 'both') and legacy INSTAGRAM_DM_TRIGGER
  const triggerNodes = await prisma.node.findMany({
    where: {
      OR: [
        { type: "INSTAGRAM_TRIGGER" },
        { type: "INSTAGRAM_DM_TRIGGER" },
      ],
    },
    include: {
      workflow: {
        select: {
          id: true,
          userId: true,
        },
      },
    },
  });

  if (triggerNodes.length === 0) {
    console.log("[Meta Instagram Webhook] No Instagram DM trigger nodes found");
    return;
  }

  console.log(`[Meta Instagram Webhook] Found ${triggerNodes.length} potential DM trigger nodes`);

  // Process each trigger node
  for (const triggerNode of triggerNodes) {
    try {
      const nodeData = triggerNode.data as TriggerNodeData | null;
      
      // Check if node has a credential configured
      if (!nodeData?.credentialId) {
        console.log(
          `[Meta Instagram Webhook] Skipping trigger node ${triggerNode.id} - no credential configured`
        );
        continue;
      }

      // For combined triggers, check if DM is enabled
      if (triggerNode.type === "INSTAGRAM_TRIGGER") {
        const combinedData = nodeData as CombinedTriggerNodeData;
        const triggerType = combinedData.triggerType || "both";
        if (triggerType === "comment") {
          console.log(
            `[Meta Instagram Webhook] Skipping trigger node ${triggerNode.id} - DM not enabled (comment only)`
          );
          continue;
        }
      }

      // Verify the credential exists and belongs to the workflow owner
      const credential = await prisma.credential.findFirst({
        where: {
          id: nodeData.credentialId,
          userId: triggerNode.workflow.userId,
          type: "META_INSTAGRAM",
        },
      });

      if (!credential) {
        console.log(
          `[Meta Instagram Webhook] Skipping trigger node ${triggerNode.id} - credential not found`
        );
        continue;
      }

      // Verify this credential is for the recipient Instagram account
      const decryptedValue = decrypt(credential.value);
      const credentialData: InstagramCredentialValue = JSON.parse(decryptedValue);

      // Check if this message is for this Instagram account
      if (credentialData.instagramAccountId !== event.recipientId) {
        console.log(
          `[Meta Instagram Webhook] Skipping trigger node ${triggerNode.id} - different Instagram account`
        );
        continue;
      }

      // Check keyword filters (handle both legacy and combined formats)
      let keywords: string[] | undefined;
      let keywordMatchMode: "any" | "all" | "exact" | undefined;
      
      if (triggerNode.type === "INSTAGRAM_TRIGGER") {
        const combinedData = nodeData as CombinedTriggerNodeData;
        keywords = combinedData.dmKeywords;
        keywordMatchMode = combinedData.dmKeywordMatchMode;
      } else {
        const legacyData = nodeData as LegacyTriggerNodeData;
        keywords = legacyData.keywords;
        keywordMatchMode = legacyData.keywordMatchMode;
      }

      if (
        keywords &&
        keywords.length > 0 &&
        !matchesKeywords(event.messageText, keywords, keywordMatchMode)
      ) {
        console.log(
          `[Meta Instagram Webhook] Skipping trigger node ${triggerNode.id} - keywords not matched`
        );
        continue;
      }

      // Save the user message to conversation history (for AI chatbot context)
      await saveUserMessage(
        triggerNode.workflow.id,
        event.senderId,
        event.messageText
      ).catch((err) => {
        console.error(
          "[Meta Instagram Webhook] Failed to save conversation history:",
          err
        );
      });

      console.log(
        `[Meta Instagram Webhook] Triggering workflow ${triggerNode.workflow.id} for DM`
      );

      // Trigger the workflow execution
      await sendWorkflowExecution({
        workflowId: triggerNode.workflow.id,
        initialData: {
          instagramDM: {
            nodeId: triggerNode.id,
            senderId: event.senderId,
            senderUsername: event.senderUsername,
            messageText: event.messageText,
            messageId: event.messageId,
            timestamp: new Date(event.timestamp).toISOString(),
            conversationId: `${event.senderId}_${event.recipientId}`,
          },
        },
      });
    } catch (error) {
      console.error(
        `[Meta Instagram Webhook] Error processing trigger node ${triggerNode.id}:`,
        error
      );
    }
  }
}

/**
 * Process Instagram comment events and trigger workflows
 */
async function processInstagramComment(event: InstagramCommentEvent) {
  console.log("[Meta Instagram Webhook] Processing comment:", {
    commentId: event.commentId,
    commenterUserId: event.commenterUserId,
    postId: event.postId,
    textLength: event.commentText?.length,
  });

  // Find all workflows with comment-compatible trigger nodes
  // This includes: INSTAGRAM_TRIGGER (with triggerType 'comment' or 'both') and legacy INSTAGRAM_COMMENT_TRIGGER
  const triggerNodes = await prisma.node.findMany({
    where: {
      OR: [
        { type: "INSTAGRAM_TRIGGER" },
        { type: "INSTAGRAM_COMMENT_TRIGGER" },
      ],
    },
    include: {
      workflow: {
        select: {
          id: true,
          userId: true,
        },
      },
    },
  });

  if (triggerNodes.length === 0) {
    console.log("[Meta Instagram Webhook] No Instagram comment trigger nodes found");
    return;
  }

  console.log(
    `[Meta Instagram Webhook] Found ${triggerNodes.length} potential comment trigger nodes`
  );

  // Process each trigger node
  for (const triggerNode of triggerNodes) {
    try {
      const nodeData = triggerNode.data as TriggerNodeData | null;

      // Check if node has a credential configured
      if (!nodeData?.credentialId) {
        console.log(
          `[Meta Instagram Webhook] Skipping trigger node ${triggerNode.id} - no credential configured`
        );
        continue;
      }

      // For combined triggers, check if comment is enabled
      if (triggerNode.type === "INSTAGRAM_TRIGGER") {
        const combinedData = nodeData as CombinedTriggerNodeData;
        const triggerType = combinedData.triggerType || "both";
        if (triggerType === "dm") {
          console.log(
            `[Meta Instagram Webhook] Skipping trigger node ${triggerNode.id} - comment not enabled (DM only)`
          );
          continue;
        }
      }

      // Verify the credential exists and belongs to the workflow owner
      const credential = await prisma.credential.findFirst({
        where: {
          id: nodeData.credentialId,
          userId: triggerNode.workflow.userId,
          type: "META_INSTAGRAM",
        },
      });

      if (!credential) {
        console.log(
          `[Meta Instagram Webhook] Skipping trigger node ${triggerNode.id} - credential not found`
        );
        continue;
      }

      // Check post ID filter (handle both legacy and combined formats)
      const postIdFilter = nodeData.postId;
      if (postIdFilter && postIdFilter !== event.postId) {
        console.log(
          `[Meta Instagram Webhook] Skipping trigger node ${triggerNode.id} - different post ID`
        );
        continue;
      }

      // Check keyword filters (handle both legacy and combined formats)
      let keywords: string[] | undefined;
      let keywordMatchMode: "any" | "all" | "exact" | undefined;
      
      if (triggerNode.type === "INSTAGRAM_TRIGGER") {
        const combinedData = nodeData as CombinedTriggerNodeData;
        keywords = combinedData.commentKeywords;
        keywordMatchMode = combinedData.commentKeywordMatchMode;
      } else {
        const legacyData = nodeData as LegacyTriggerNodeData;
        keywords = legacyData.keywords;
        keywordMatchMode = legacyData.keywordMatchMode;
      }

      if (
        keywords &&
        keywords.length > 0 &&
        !matchesKeywords(event.commentText, keywords, keywordMatchMode)
      ) {
        console.log(
          `[Meta Instagram Webhook] Skipping trigger node ${triggerNode.id} - keywords not matched`
        );
        continue;
      }

      console.log(
        `[Meta Instagram Webhook] Triggering workflow ${triggerNode.workflow.id} for comment`
      );

      // Trigger the workflow execution
      await sendWorkflowExecution({
        workflowId: triggerNode.workflow.id,
        initialData: {
          instagramComment: {
            nodeId: triggerNode.id,
            commentId: event.commentId,
            commentText: event.commentText,
            commenterUserId: event.commenterUserId,
            commenterUsername: event.commenterUsername,
            postId: event.postId,
            mediaId: event.mediaId,
            timestamp: new Date(event.timestamp).toISOString(),
            parentCommentId: event.parentCommentId,
          },
        },
      });
    } catch (error) {
      console.error(
        `[Meta Instagram Webhook] Error processing trigger node ${triggerNode.id}:`,
        error
      );
    }
  }
}

/**
 * Meta Webhook Verification (GET request)
 * 
 * Meta sends a GET request to verify the webhook URL during setup.
 * We need to respond with the hub.challenge value.
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  const verifyToken = process.env.META_WEBHOOK_VERIFY_TOKEN;

  if (!verifyToken) {
    console.error("[Meta Instagram Webhook] META_WEBHOOK_VERIFY_TOKEN not configured");
    return NextResponse.json({ error: "Not configured" }, { status: 500 });
  }

  if (mode === "subscribe" && token === verifyToken) {
    console.log("[Meta Instagram Webhook] Webhook verification successful");
    return new Response(challenge, { status: 200 });
  }

  console.error("[Meta Instagram Webhook] Webhook verification failed", {
    mode,
    tokenMatch: token === verifyToken,
  });
  return NextResponse.json({ error: "Verification failed" }, { status: 403 });
}

/**
 * Meta Webhook Handler (POST request)
 * 
 * Processes incoming Instagram events from Meta's webhook.
 */
export async function POST(request: NextRequest) {
  console.log("=== [Meta Instagram Webhook] 📥 POST Request Received ===");
  
  try {
    // CRITICAL: Get raw body BEFORE any parsing
    const rawBody = await request.text();
    console.log("[Meta Instagram Webhook] Raw body length:", rawBody.length);
    console.log("[Meta Instagram Webhook] 🔍 ENHANCED DEBUG - Raw body first 200 chars:", rawBody.substring(0, 200));
    console.log("[Meta Instagram Webhook] 🔍 ENHANCED DEBUG - Raw body last 100 chars:", rawBody.substring(rawBody.length - 100));
    
    const signature = request.headers.get("x-hub-signature-256");
    console.log("[Meta Instagram Webhook] Signature present:", !!signature);
    console.log("[Meta Instagram Webhook] 🔍 ENHANCED DEBUG - Received signature:", signature);
    
    if (!signature) {
      console.error("[Meta Instagram Webhook] Missing signature header");
      return NextResponse.json({ error: "Missing signature" }, { status: 401 });
    }

    const appSecret = process.env.META_APP_SECRET;
    if (!appSecret) {
      console.error("[Meta Instagram Webhook] META_APP_SECRET not configured");
      return NextResponse.json(
        { error: "Server configuration error" },
        { status: 500 }
      );
    }

    console.log("[Meta Instagram Webhook] App secret present:", !!appSecret);
    console.log("[Meta Instagram Webhook] App secret length:", appSecret.length);
    console.log("[Meta Instagram Webhook] 🔍 ENHANCED DEBUG - App secret first 8 chars:", appSecret.substring(0, 8));
    console.log("[Meta Instagram Webhook] 🔍 ENHANCED DEBUG - App secret last 4 chars:", appSecret.substring(appSecret.length - 4));

    // Verify signature with RAW body string (body first, then signature)
    if (!verifyWebhookSignature(rawBody, signature, appSecret)) {
      console.error("[Meta Instagram Webhook] Invalid webhook signature");
      console.error("[Meta Instagram Webhook] This could mean:");
      console.error("[Meta Instagram Webhook]   1. META_APP_SECRET doesn't match the app secret in Meta Developer Console");
      console.error("[Meta Instagram Webhook]   2. The webhook payload was modified in transit");
      console.error("[Meta Instagram Webhook]   3. The signature header format is unexpected");
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    console.log("[Meta Instagram Webhook] ✅ Signature verification PASSED");

    // NOW parse the JSON body
    const body: MetaWebhookPayload = JSON.parse(rawBody);
    console.log(
      "[Meta Instagram Webhook] Webhook payload:",
      JSON.stringify(body, null, 2)
    );

    // Verify this is an Instagram webhook
    if (body.object !== "instagram") {
      console.log("[Meta Instagram Webhook] Ignoring non-Instagram webhook:", body.object);
      return NextResponse.json({ success: true });
    }

    console.log("[Meta Instagram Webhook] Processing Instagram webhook with", body.entry?.length, "entries");

    // Process each entry
    for (const entry of body.entry || []) {
      // Process messaging events (DMs)
      if (entry.messaging) {
        console.log("[Meta Instagram Webhook] Processing", entry.messaging.length, "messaging events");
        for (const messagingEvent of entry.messaging) {
          const dmEvent = parseMessagingWebhook({ messaging: [messagingEvent] });
          if (dmEvent) {
            await processInstagramDM(dmEvent);
          }
        }
      }

      // Process comment events
      if (entry.changes) {
        console.log("[Meta Instagram Webhook] Processing", entry.changes.length, "change events");
        for (const change of entry.changes) {
          if (change.field === "comments") {
            const commentEvent = parseCommentWebhook({ changes: [change] });
            if (commentEvent) {
              await processInstagramComment(commentEvent);
            }
          }
        }
      }
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("[Meta Instagram Webhook] Error processing webhook:", error);
    // Return 200 to prevent Meta from retrying
    return NextResponse.json(
      { success: false, error: "Internal error" },
      { status: 200 }
    );
  }
}

