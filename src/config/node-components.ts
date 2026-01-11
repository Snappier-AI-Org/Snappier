import type { NodeTypes } from "@xyflow/react";
import { InitialNode } from "@/components/initial-node";
import { AnthropicNode } from "@/features/executions/components/anthropic/node";
import { CodeNode } from "@/features/executions/components/code/node";
import { DelayWaitNode } from "@/features/executions/components/delay-wait/node";
import { DiscordNode } from "@/features/executions/components/discord/node";
import { ErrorTriggerNode } from "@/features/executions/components/error-trigger/node";
import { FilterConditionalNode } from "@/features/executions/components/filter-conditional/node";
import { GithubNode } from "@/features/executions/components/github/node";
import { GmailNode } from "@/features/executions/components/gmail/node";
import { GoogleCalendarNode } from "@/features/executions/components/google-calendar/node";
import { GoogleDocsNode } from "@/features/executions/components/google-docs/node";
import { GoogleDriveNode } from "@/features/executions/components/google-drive/node";
import { GoogleSheetsNode } from "@/features/executions/components/google-sheets/node";
import { GroqNode } from "@/features/executions/components/groq/node";
import { HttpRequestNode } from "@/features/executions/components/http-request/node";
import { HuggingFaceNode } from "@/features/executions/components/huggingface/node";
import { InstagramCommentReplyNode } from "@/features/executions/components/instagram-comment-reply/node";
import { InstagramDmNode } from "@/features/executions/components/instagram-dm/node";
import { LoopNode } from "@/features/executions/components/loop/node";
import { MergeNode } from "@/features/executions/components/merge/node";
import { NotionNode } from "@/features/executions/components/notion/node";
import { OpenRouterNode } from "@/features/executions/components/openrouter/node";
import { OutlookNode } from "@/features/executions/components/outlook/node";
import { SetNode } from "@/features/executions/components/set/node";
import { SlackNode } from "@/features/executions/components/slack/node";
import { SplitNode } from "@/features/executions/components/split/node";
import { SwitchNode } from "@/features/executions/components/switch/node";
import { TelegramNode } from "@/features/executions/components/telegram/node";
import { TodoistNode } from "@/features/executions/components/todoist/node";
import { TrelloNode } from "@/features/executions/components/trello/node";
import { WhatsAppNode } from "@/features/executions/components/whatsapp/node";
import { ZaloNode } from "@/features/executions/components/zalo/node";
import { DiscordTriggerNode } from "@/features/triggers/components/discord-trigger/node";
import { GmailTriggerNode } from "@/features/triggers/components/gmail-trigger/node";
import { GoogleFormTrigger } from "@/features/triggers/components/google-form-trigger/node";
import { InstagramCommentTriggerNode } from "@/features/triggers/components/instagram-comment-trigger/node";
import { InstagramDmTriggerNode } from "@/features/triggers/components/instagram-dm-trigger/node";
import { InstagramTriggerNode } from "@/features/triggers/components/instagram-trigger/node";
import { ManualTriggerNode } from "@/features/triggers/components/manual-trigger/node";
import { ScheduleTriggerNode } from "@/features/triggers/components/schedule-trigger/node";
import { StripeTriggerNode } from "@/features/triggers/components/stripe-trigger/node";
import { WebhookTriggerNode } from "@/features/triggers/components/webhook-trigger/node";
import { NodeType } from "@/generated/prisma";
import { GeminiNode } from "../features/executions/components/gemini/node";
import { OpenAiNode } from "../features/executions/components/openai/node";

export const nodeComponents = {
  [NodeType.INITIAL]: InitialNode,
  [NodeType.MANUAL_TRIGGER]: ManualTriggerNode,
  [NodeType.HTTP_REQUEST]: HttpRequestNode,
  [NodeType.GOOGLE_FORM_TRIGGER]: GoogleFormTrigger,
  [NodeType.STRIPE_TRIGGER]: StripeTriggerNode,
  [NodeType.GMAIL_TRIGGER]: GmailTriggerNode,
  [NodeType.SCHEDULE_TRIGGER]: ScheduleTriggerNode,
  [NodeType.WEBHOOK_TRIGGER]: WebhookTriggerNode,
  [NodeType.DISCORD_TRIGGER]: DiscordTriggerNode,
  [NodeType.INSTAGRAM_TRIGGER]: InstagramTriggerNode,
  [NodeType.INSTAGRAM_DM_TRIGGER]: InstagramDmTriggerNode,
  [NodeType.INSTAGRAM_COMMENT_TRIGGER]: InstagramCommentTriggerNode,
  [NodeType.GEMINI]: GeminiNode,
  [NodeType.OPENAI]: OpenAiNode,
  [NodeType.ANTHROPIC]: AnthropicNode,
  [NodeType.GROQ]: GroqNode,
  [NodeType.HUGGINGFACE]: HuggingFaceNode,
  [NodeType.OPENROUTER]: OpenRouterNode,
  [NodeType.DISCORD]: DiscordNode,
  [NodeType.SLACK]: SlackNode,
  [NodeType.TELEGRAM]: TelegramNode,
  [NodeType.WHATSAPP]: WhatsAppNode,
  [NodeType.ZALO]: ZaloNode,
  [NodeType.INSTAGRAM_DM]: InstagramDmNode,
  [NodeType.INSTAGRAM_COMMENT_REPLY]: InstagramCommentReplyNode,
  [NodeType.GOOGLE_SHEETS]: GoogleSheetsNode,
  [NodeType.GOOGLE_DRIVE]: GoogleDriveNode,
  [NodeType.GMAIL]: GmailNode,
  [NodeType.GOOGLE_CALENDAR]: GoogleCalendarNode,
  [NodeType.GOOGLE_DOCS]: GoogleDocsNode,
  [NodeType.TRELLO]: TrelloNode,
  [NodeType.OUTLOOK]: OutlookNode,
  [NodeType.NOTION]: NotionNode,
  [NodeType.GITHUB]: GithubNode,
  [NodeType.TODOIST]: TodoistNode,
  [NodeType.FILTER_CONDITIONAL]: FilterConditionalNode,
  [NodeType.DELAY_WAIT]: DelayWaitNode,
  [NodeType.SWITCH]: SwitchNode,
  [NodeType.CODE]: CodeNode,
  [NodeType.MERGE]: MergeNode,
  [NodeType.SPLIT]: SplitNode,
  [NodeType.LOOP]: LoopNode,
  [NodeType.SET]: SetNode,
  [NodeType.ERROR_TRIGGER]: ErrorTriggerNode,
} as const satisfies NodeTypes;

export type RegisteredNodeType = keyof typeof nodeComponents;
