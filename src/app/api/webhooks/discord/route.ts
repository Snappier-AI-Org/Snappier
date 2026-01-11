import { type NextRequest, NextResponse } from "next/server";
import { sendWorkflowExecution } from "@/inngest/utils";
import prisma from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type DiscordTriggerNodeData = {
  channelId?: string;
  guildId?: string;
  listenToDMs?: boolean;
  keywordFilters?: string[];
  keywordMatchMode?: "any" | "all" | "exact";
  includeBots?: boolean;
};

type DiscordMessagePayload = {
  guildId?: string;
  channelId?: string;
  messageId: string;
  content?: string;
  authorId: string;
  authorUsername?: string;
  isBot?: boolean;
  isDM?: boolean;
  timestamp?: string;
  attachments?: Array<{ id: string; url: string; filename?: string }>;
};

function matchesKeywords(
  text: string,
  keywords: string[] | undefined,
  matchMode: "any" | "all" | "exact" = "any",
): boolean {
  if (!keywords || keywords.length === 0) return true;

  const lowerText = text.toLowerCase();
  const lowerKeywords = keywords.map((k) => k.toLowerCase().trim());

  switch (matchMode) {
    case "exact":
      return lowerKeywords.some((k) => lowerText === k);
    case "all":
      return lowerKeywords.every((k) => lowerText.includes(k));
    default:
      return lowerKeywords.some((k) => lowerText.includes(k));
  }
}

export async function POST(req: NextRequest) {
  try {
    const sharedSecret = process.env.DISCORD_TRIGGER_WEBHOOK_SECRET;
    if (sharedSecret) {
      const header = req.headers.get("x-discord-trigger-secret");
      if (header !== sharedSecret) {
        return NextResponse.json({ error: "unauthorized" }, { status: 401 });
      }
    }

    const payload = (await req.json()) as DiscordMessagePayload | null;
    if (!payload || !payload.messageId || !payload.authorId) {
      return NextResponse.json({ error: "invalid payload" }, { status: 400 });
    }

    const triggerNodes = await prisma.node.findMany({
      where: { type: "DISCORD_TRIGGER" },
      include: {
        workflow: {
          select: {
            id: true,
            userId: true,
          },
        },
      },
    });

    if (!triggerNodes.length) {
      return NextResponse.json({ success: true, processed: 0 });
    }

    let processed = 0;

    for (const triggerNode of triggerNodes) {
      const data = (triggerNode.data as DiscordTriggerNodeData | null) || {};

      if (payload.isDM && data.listenToDMs === false) continue;
      if (
        !payload.isDM &&
        data.channelId &&
        data.channelId !== payload.channelId
      )
        continue;
      if (!payload.isDM && data.guildId && data.guildId !== payload.guildId)
        continue;
      if (payload.isBot && data.includeBots !== true) continue;
      if (
        !matchesKeywords(
          payload.content ?? "",
          data.keywordFilters,
          data.keywordMatchMode,
        )
      )
        continue;

      await sendWorkflowExecution({
        workflowId: triggerNode.workflow.id,
        initialData: {
          discordMessage: {
            nodeId: triggerNode.id,
            guildId: payload.guildId,
            channelId: payload.channelId,
            messageId: payload.messageId,
            content: payload.content ?? "",
            authorId: payload.authorId,
            authorUsername: payload.authorUsername,
            isBot: !!payload.isBot,
            isDM: !!payload.isDM,
            timestamp: payload.timestamp || new Date().toISOString(),
            attachments: payload.attachments ?? [],
          },
        },
      });

      processed += 1;
    }

    return NextResponse.json({ success: true, processed });
  } catch (error) {
    console.error("[Discord Trigger Webhook] Error handling payload", error);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
