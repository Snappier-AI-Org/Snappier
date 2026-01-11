import { NodeType } from "@/generated/prisma";
import { NodeExecutor } from "../types";
import { manualTriggerExecutor } from "@/features/triggers/components/manual-trigger/executor";
import { httpRequestExecutor } from "../components/http-request/executor";
import { googleFormTriggerExecutor } from "@/features/triggers/components/google-form-trigger/executor";
import { stripeTriggerExecutor } from "@/features/triggers/components/stripe-trigger/executor";
import { gmailTriggerExecutor } from "@/features/triggers/components/gmail-trigger/executor";
import { scheduleTriggerExecutor } from "@/features/triggers/components/schedule-trigger/executor";
import { webhookTriggerExecutor } from "@/features/triggers/components/webhook-trigger/executor";
import { instagramTriggerExecutor } from "@/features/triggers/components/instagram-trigger/executor";
import { instagramDmTriggerExecutor } from "@/features/triggers/components/instagram-dm-trigger/executor";
import { instagramCommentTriggerExecutor } from "@/features/triggers/components/instagram-comment-trigger/executor";
import { discordTriggerExecutor } from "@/features/triggers/components/discord-trigger/executor";
import { geminiExecutor } from "../components/gemini/executor";
import { openAiExecutor } from "../components/openai/executor";
import { anthropicExecutor } from "../components/anthropic/executor";
import { groqExecutor } from "../components/groq/executor";
import { huggingfaceExecutor } from "../components/huggingface/executor";
import { openrouterExecutor } from "../components/openrouter/executor";
import { discordExecutor } from "../components/discord/executor";
import { slackExecutor } from "../components/slack/executor";
import { telegramExecutor } from "../components/telegram/executor";
import { whatsappExecutor } from "../components/whatsapp/executor";
import { zaloExecutor } from "../components/zalo/executor";
import { instagramDmExecutor } from "../components/instagram-dm/executor";
import { instagramCommentReplyExecutor } from "../components/instagram-comment-reply/executor";
import { googleSheetsExecutor } from "../components/google-sheets/executor";
import { googleDriveExecutor } from "../components/google-drive/executor";
import { gmailExecutor } from "../components/gmail/executor";
import { googleCalendarExecutor } from "../components/google-calendar/executor";
import { googleDocsExecutor } from "../components/google-docs/executor";
import { trelloExecutor } from "../components/trello/executor";
import { outlookExecutor } from "../components/outlook/executor";
import { notionExecutor } from "../components/notion/executor";
import { githubExecutor } from "../components/github/executor";
import { todoistExecutor } from "../components/todoist/executor";
import { filterConditionalExecutor } from "../components/filter-conditional/executor";
import { delayWaitExecutor } from "../components/delay-wait/executor";
import { switchExecutor } from "../components/switch/executor";
import { codeExecutor } from "../components/code/executor";
import { mergeExecutor } from "../components/merge/executor";
import { splitExecutor } from "../components/split/executor";
import { loopExecutor } from "../components/loop/executor";
import { setExecutor } from "../components/set/executor";
import { errorTriggerExecutor } from "../components/error-trigger/executor";

export const executorRegistry: Partial<Record<NodeType, NodeExecutor>> = {
  [NodeType.INITIAL]: manualTriggerExecutor,
  [NodeType.MANUAL_TRIGGER]: manualTriggerExecutor,
  [NodeType.HTTP_REQUEST]: httpRequestExecutor, 
  [NodeType.GOOGLE_FORM_TRIGGER]: googleFormTriggerExecutor,
  [NodeType.STRIPE_TRIGGER]: stripeTriggerExecutor,
  [NodeType.GMAIL_TRIGGER]: gmailTriggerExecutor,
  [NodeType.SCHEDULE_TRIGGER]: scheduleTriggerExecutor,
  [NodeType.WEBHOOK_TRIGGER]: webhookTriggerExecutor,
  [NodeType.DISCORD_TRIGGER]: discordTriggerExecutor,
  [NodeType.INSTAGRAM_TRIGGER]: instagramTriggerExecutor,
  [NodeType.INSTAGRAM_DM_TRIGGER]: instagramDmTriggerExecutor,
  [NodeType.INSTAGRAM_COMMENT_TRIGGER]: instagramCommentTriggerExecutor,
  [NodeType.GEMINI]: geminiExecutor,
  [NodeType.ANTHROPIC]: anthropicExecutor,
  [NodeType.OPENAI]: openAiExecutor,
  [NodeType.GROQ]: groqExecutor,
  [NodeType.HUGGINGFACE]: huggingfaceExecutor,
  [NodeType.OPENROUTER]: openrouterExecutor,
  [NodeType.DISCORD]: discordExecutor,
  [NodeType.SLACK]: slackExecutor,
  [NodeType.TELEGRAM]: telegramExecutor,
  [NodeType.WHATSAPP]: whatsappExecutor,
  [NodeType.ZALO]: zaloExecutor,
  [NodeType.INSTAGRAM_DM]: instagramDmExecutor,
  [NodeType.INSTAGRAM_COMMENT_REPLY]: instagramCommentReplyExecutor,
  [NodeType.GOOGLE_SHEETS]: googleSheetsExecutor,
  [NodeType.GOOGLE_DRIVE]: googleDriveExecutor,
  [NodeType.GMAIL]: gmailExecutor,
  [NodeType.GOOGLE_CALENDAR]: googleCalendarExecutor,
  [NodeType.GOOGLE_DOCS]: googleDocsExecutor,
  [NodeType.TRELLO]: trelloExecutor,
  [NodeType.OUTLOOK]: outlookExecutor,
  [NodeType.NOTION]: notionExecutor,
  [NodeType.GITHUB]: githubExecutor,
  [NodeType.TODOIST]: todoistExecutor,
  [NodeType.FILTER_CONDITIONAL]: filterConditionalExecutor,
  [NodeType.DELAY_WAIT]: delayWaitExecutor,
  [NodeType.SWITCH]: switchExecutor,
  [NodeType.CODE]: codeExecutor,
  [NodeType.MERGE]: mergeExecutor,
  [NodeType.SPLIT]: splitExecutor,
  [NodeType.LOOP]: loopExecutor,
  [NodeType.SET]: setExecutor,
  [NodeType.ERROR_TRIGGER]: errorTriggerExecutor,
};
export const getExecutor = (type: NodeType): NodeExecutor => {
  const executor = executorRegistry[type];
  if (!executor) {
    throw new Error(`No executor found for node type: ${type}`);
  }

  return executor;
};