/**
 * Lightweight Node Registry for AI Agent
 * ONLY includes nodes that are actually implemented in the app
 */

import { NodeType } from "@/generated/prisma";

export interface NodeInfo {
  type: NodeType;
  name: string;
  description: string;
  category:
    | "trigger"
    | "ai"
    | "messaging"
    | "google"
    | "productivity"
    | "logic";
  requiredFields: string[];
  optionalFields?: string[];
  exampleConfig?: Record<string, unknown>;
  aliases: string[];
}

// Only nodes that are actually implemented
export const NODE_REGISTRY: Record<string, NodeInfo> = {
  // ============================================
  // TRIGGERS (10 implemented)
  // ============================================
  [NodeType.MANUAL_TRIGGER]: {
    type: NodeType.MANUAL_TRIGGER,
    name: "Manual Trigger",
    description: "Runs workflow when manually clicked",
    category: "trigger",
    requiredFields: [],
    aliases: ["manual", "button", "click trigger"],
  },
  [NodeType.GOOGLE_FORM_TRIGGER]: {
    type: NodeType.GOOGLE_FORM_TRIGGER,
    name: "Google Form Trigger",
    description: "Runs when a Google Form is submitted",
    category: "trigger",
    requiredFields: [],
    aliases: ["form", "google form", "form submission"],
  },
  [NodeType.STRIPE_TRIGGER]: {
    type: NodeType.STRIPE_TRIGGER,
    name: "Stripe Trigger",
    description: "Runs on Stripe events (payments, subscriptions)",
    category: "trigger",
    requiredFields: [],
    aliases: ["stripe", "payment", "stripe payment"],
  },
  [NodeType.GMAIL_TRIGGER]: {
    type: NodeType.GMAIL_TRIGGER,
    name: "Gmail Trigger",
    description: "Runs when new email is received",
    category: "trigger",
    requiredFields: ["credentialId"],
    aliases: ["email trigger", "new email", "gmail watch"],
  },
  [NodeType.SCHEDULE_TRIGGER]: {
    type: NodeType.SCHEDULE_TRIGGER,
    name: "Schedule Trigger",
    description: "Runs on a schedule (cron, daily, weekly)",
    category: "trigger",
    requiredFields: ["scheduleType"],
    optionalFields: [
      "cronExpression",
      "intervalValue",
      "hour",
      "minute",
      "timezone",
    ],
    exampleConfig: { scheduleType: "DAILY", hour: 9, minute: 0 },
    aliases: ["schedule", "cron", "timer", "recurring"],
  },
  [NodeType.WEBHOOK_TRIGGER]: {
    type: NodeType.WEBHOOK_TRIGGER,
    name: "Webhook Trigger",
    description: "Runs when a webhook is received",
    category: "trigger",
    requiredFields: [],
    aliases: ["webhook", "incoming webhook"],
  },
  [NodeType.INSTAGRAM_TRIGGER]: {
    type: NodeType.INSTAGRAM_TRIGGER,
    name: "Instagram Trigger",
    description: "Runs on Instagram events",
    category: "trigger",
    requiredFields: ["credentialId"],
    aliases: ["instagram trigger", "ig trigger"],
  },
  [NodeType.INSTAGRAM_DM_TRIGGER]: {
    type: NodeType.INSTAGRAM_DM_TRIGGER,
    name: "Instagram DM Trigger",
    description: "Runs when Instagram DM is received",
    category: "trigger",
    requiredFields: ["credentialId"],
    aliases: ["instagram dm trigger", "ig dm trigger"],
  },
  [NodeType.INSTAGRAM_COMMENT_TRIGGER]: {
    type: NodeType.INSTAGRAM_COMMENT_TRIGGER,
    name: "Instagram Comment Trigger",
    description: "Runs when Instagram comment is received",
    category: "trigger",
    requiredFields: ["credentialId"],
    aliases: ["instagram comment trigger", "ig comment trigger"],
  },
  [NodeType.DISCORD_TRIGGER]: {
    type: NodeType.DISCORD_TRIGGER,
    name: "Discord Trigger",
    description: "Runs when a Discord message is received",
    category: "trigger",
    requiredFields: [],
    optionalFields: [
      "channelId",
      "guildId",
      "listenToDMs",
      "keywordFilters",
      "keywordMatchMode",
      "includeBots",
    ],
    aliases: [
      "discord trigger",
      "discord message trigger",
      "discord channel trigger",
    ],
  },

  // ============================================
  // AI NODES (3 implemented)
  // ============================================
  [NodeType.OPENAI]: {
    type: NodeType.OPENAI,
    name: "OpenAI",
    description: "Generate text with GPT models",
    category: "ai",
    requiredFields: ["variableName", "credentialId", "userPrompt"],
    optionalFields: ["systemPrompt", "model", "temperature"],
    aliases: ["openai", "gpt", "chatgpt", "gpt-4"],
  },
  [NodeType.ANTHROPIC]: {
    type: NodeType.ANTHROPIC,
    name: "Anthropic Claude",
    description: "Generate text with Claude models",
    category: "ai",
    requiredFields: ["variableName", "credentialId", "userPrompt"],
    optionalFields: ["systemPrompt", "model"],
    aliases: ["anthropic", "claude"],
  },
  [NodeType.GEMINI]: {
    type: NodeType.GEMINI,
    name: "Google Gemini",
    description: "Generate text with Gemini models",
    category: "ai",
    requiredFields: ["variableName", "credentialId", "userPrompt"],
    optionalFields: ["systemPrompt"],
    aliases: ["gemini", "bard", "google ai"],
  },
  // Note: GROQ, HUGGINGFACE, and OPENROUTER are also available but use similar config as above

  // ============================================
  // MESSAGING NODES (8 implemented)
  // ============================================
  [NodeType.DISCORD]: {
    type: NodeType.DISCORD,
    name: "Discord",
    description: "Send message to Discord channel",
    category: "messaging",
    requiredFields: ["variableName", "webhookUrl", "content"],
    aliases: ["discord", "discord message"],
  },
  [NodeType.SLACK]: {
    type: NodeType.SLACK,
    name: "Slack",
    description: "Send message to Slack channel",
    category: "messaging",
    requiredFields: ["variableName", "webhookUrl", "content"],
    aliases: ["slack", "slack message"],
  },
  [NodeType.TELEGRAM]: {
    type: NodeType.TELEGRAM,
    name: "Telegram",
    description: "Send message via Telegram bot",
    category: "messaging",
    requiredFields: ["variableName", "botToken", "chatId", "content"],
    optionalFields: ["parseMode"],
    aliases: ["telegram", "telegram message"],
  },
  [NodeType.WHATSAPP]: {
    type: NodeType.WHATSAPP,
    name: "WhatsApp",
    description: "Send message via WhatsApp Business",
    category: "messaging",
    requiredFields: ["variableName", "credentialId", "phoneNumber", "content"],
    aliases: ["whatsapp", "wa", "whatsapp message"],
  },
  [NodeType.ZALO]: {
    type: NodeType.ZALO,
    name: "Zalo Bot",
    description: "Send message via Zalo Bot",
    category: "messaging",
    requiredFields: ["variableName", "accessToken", "recipientId", "content"],
    aliases: ["zalo", "zalo bot", "zalo message", "zalo chatbot"],
  },
  [NodeType.INSTAGRAM_DM]: {
    type: NodeType.INSTAGRAM_DM,
    name: "Instagram DM",
    description: "Send Instagram Direct Message",
    category: "messaging",
    requiredFields: ["variableName", "credentialId", "recipientId", "content"],
    aliases: ["instagram dm", "ig dm", "instagram message"],
  },
  [NodeType.INSTAGRAM_COMMENT_REPLY]: {
    type: NodeType.INSTAGRAM_COMMENT_REPLY,
    name: "Instagram Comment Reply",
    description: "Reply to Instagram comments",
    category: "messaging",
    requiredFields: ["variableName", "credentialId", "commentId", "content"],
    aliases: ["instagram reply", "ig comment reply"],
  },

  // ============================================
  // GOOGLE WORKSPACE (5 implemented)
  // ============================================
  [NodeType.GOOGLE_SHEETS]: {
    type: NodeType.GOOGLE_SHEETS,
    name: "Google Sheets",
    description: "Read/write data to Google Sheets",
    category: "google",
    requiredFields: [
      "variableName",
      "credentialId",
      "spreadsheetId",
      "sheetName",
      "operation",
    ],
    optionalFields: ["range", "values"],
    aliases: ["sheets", "spreadsheet", "google sheets"],
  },
  [NodeType.GOOGLE_DRIVE]: {
    type: NodeType.GOOGLE_DRIVE,
    name: "Google Drive",
    description: "Manage files in Google Drive",
    category: "google",
    requiredFields: ["variableName", "credentialId", "operation"],
    optionalFields: ["fileId", "folderId", "fileName"],
    aliases: ["drive", "google drive"],
  },
  [NodeType.GMAIL]: {
    type: NodeType.GMAIL,
    name: "Gmail",
    description: "Send/read emails in Gmail",
    category: "google",
    requiredFields: ["variableName", "credentialId", "operation"],
    optionalFields: ["to", "subject", "body", "messageId"],
    aliases: ["gmail", "email", "send email"],
  },
  [NodeType.GOOGLE_CALENDAR]: {
    type: NodeType.GOOGLE_CALENDAR,
    name: "Google Calendar",
    description: "Manage calendar events",
    category: "google",
    requiredFields: ["variableName", "credentialId", "operation"],
    optionalFields: ["calendarId", "summary", "startDateTime", "endDateTime"],
    aliases: ["calendar", "google calendar", "gcal"],
  },
  [NodeType.GOOGLE_DOCS]: {
    type: NodeType.GOOGLE_DOCS,
    name: "Google Docs",
    description: "Create/edit documents",
    category: "google",
    requiredFields: ["variableName", "credentialId", "operation"],
    optionalFields: ["documentId", "title", "content"],
    aliases: ["docs", "google docs"],
  },

  // ============================================
  // PRODUCTIVITY (5 implemented)
  // ============================================
  [NodeType.HTTP_REQUEST]: {
    type: NodeType.HTTP_REQUEST,
    name: "HTTP Request",
    description: "Make API calls to external services",
    category: "productivity",
    requiredFields: ["variableName", "endpoint", "method"],
    optionalFields: ["body", "headers"],
    aliases: ["http", "api", "request", "fetch"],
  },
  [NodeType.TRELLO]: {
    type: NodeType.TRELLO,
    name: "Trello",
    description: "Manage Trello boards and cards",
    category: "productivity",
    requiredFields: ["variableName", "credentialId", "operation"],
    optionalFields: ["boardId", "listId", "cardId", "name"],
    aliases: ["trello", "trello card"],
  },
  [NodeType.OUTLOOK]: {
    type: NodeType.OUTLOOK,
    name: "Outlook",
    description: "Manage Microsoft Outlook emails",
    category: "productivity",
    requiredFields: ["variableName", "credentialId", "operation"],
    optionalFields: ["to", "subject", "body"],
    aliases: ["outlook", "microsoft outlook"],
  },
  [NodeType.NOTION]: {
    type: NodeType.NOTION,
    name: "Notion",
    description: "Manage Notion pages and databases",
    category: "productivity",
    requiredFields: ["variableName", "credentialId", "operation"],
    optionalFields: ["pageId", "databaseId", "properties"],
    aliases: ["notion", "notion page"],
  },
  [NodeType.GITHUB]: {
    type: NodeType.GITHUB,
    name: "GitHub",
    description: "Manage GitHub repos and issues",
    category: "productivity",
    requiredFields: ["variableName", "credentialId", "operation"],
    optionalFields: ["owner", "repo", "title", "body"],
    aliases: ["github", "git", "github issue"],
  },
  [NodeType.TODOIST]: {
    type: NodeType.TODOIST,
    name: "Todoist",
    description: "Manage tasks and projects in Todoist",
    category: "productivity",
    requiredFields: ["variableName", "credentialId", "operation"],
    optionalFields: ["taskId", "content", "projectId", "description", "dueString"],
    aliases: ["todoist", "task", "to do", "todo"],
  },

  // ============================================
  // LOGIC NODES (9 implemented)
  // ============================================
  [NodeType.FILTER_CONDITIONAL]: {
    type: NodeType.FILTER_CONDITIONAL,
    name: "Filter / Conditional",
    description: "Branch workflow with if/else logic",
    category: "logic",
    requiredFields: ["variableName", "condition"],
    exampleConfig: {
      variableName: "filterResult",
      condition: "{{value}} > 10",
    },
    aliases: ["filter", "if", "condition", "branch"],
  },
  [NodeType.DELAY_WAIT]: {
    type: NodeType.DELAY_WAIT,
    name: "Delay / Wait",
    description: "Pause workflow for specified duration",
    category: "logic",
    requiredFields: ["delay", "unit"],
    exampleConfig: { delay: 5, unit: "minutes" },
    aliases: ["delay", "wait", "pause", "sleep"],
  },
  [NodeType.SWITCH]: {
    type: NodeType.SWITCH,
    name: "Switch",
    description: "Route to different outputs based on rules",
    category: "logic",
    requiredFields: ["variableName", "rules"],
    exampleConfig: {
      variableName: "switchResult",
      rules: [{ name: "Rule 1", condition: "true", output: 0 }],
    },
    aliases: ["switch", "router", "route", "case"],
  },
  [NodeType.CODE]: {
    type: NodeType.CODE,
    name: "Code",
    description: "Execute custom JavaScript code",
    category: "logic",
    requiredFields: ["variableName", "code"],
    exampleConfig: {
      variableName: "result",
      code: "return { message: 'Hello' };",
    },
    aliases: ["code", "function", "javascript", "js", "script"],
  },
  [NodeType.MERGE]: {
    type: NodeType.MERGE,
    name: "Merge",
    description: "Combine data from multiple inputs",
    category: "logic",
    requiredFields: ["variableName", "mode"],
    optionalFields: ["combineBy", "keyField", "inputs"],
    exampleConfig: { variableName: "merged", mode: "append" },
    aliases: ["merge", "combine", "join", "concat"],
  },
  [NodeType.SPLIT]: {
    type: NodeType.SPLIT,
    name: "Split",
    description: "Split data into batches or groups",
    category: "logic",
    requiredFields: ["variableName", "mode"],
    optionalFields: ["batchSize", "field", "delimiter"],
    exampleConfig: {
      variableName: "batches",
      mode: "splitInBatches",
      batchSize: 10,
    },
    aliases: ["split", "batch", "chunk", "divide"],
  },
  [NodeType.LOOP]: {
    type: NodeType.LOOP,
    name: "Loop",
    description: "Iterate over items or repeat actions",
    category: "logic",
    requiredFields: ["variableName", "mode"],
    optionalFields: ["inputVariable", "times", "condition", "maxIterations"],
    exampleConfig: {
      variableName: "loopResult",
      mode: "forEach",
      inputVariable: "items",
    },
    aliases: ["loop", "iterate", "for each", "repeat"],
  },
  [NodeType.SET]: {
    type: NodeType.SET,
    name: "Set",
    description: "Set or modify workflow variables",
    category: "logic",
    requiredFields: ["fields"],
    optionalFields: ["keepOnlySet"],
    exampleConfig: {
      fields: [{ name: "myVar", value: "hello", type: "string" }],
    },
    aliases: ["set", "variable", "assign", "define"],
  },
  [NodeType.ERROR_TRIGGER]: {
    type: NodeType.ERROR_TRIGGER,
    name: "Error Trigger",
    description: "Handle errors from previous nodes",
    category: "logic",
    requiredFields: ["variableName"],
    optionalFields: ["continueOnError"],
    exampleConfig: { variableName: "error", continueOnError: true },
    aliases: ["error", "catch", "error handler", "try catch"],
  },

  // ============================================
  // INTERNAL (not user-addable)
  // ============================================
  [NodeType.INITIAL]: {
    type: NodeType.INITIAL,
    name: "Initial",
    description: "Placeholder node (internal use)",
    category: "trigger",
    requiredFields: [],
    aliases: [],
  },
};

// Quick lookup by alias
const aliasMap = new Map<string, NodeType>();
Object.values(NODE_REGISTRY).forEach((info) => {
  info.aliases.forEach((alias) => {
    aliasMap.set(alias.toLowerCase(), info.type);
  });
  aliasMap.set(info.type.toLowerCase(), info.type);
  aliasMap.set(info.name.toLowerCase(), info.type);
});

/**
 * Find node type by alias or name
 */
export function findNodeTypeByAlias(query: string): NodeType | null {
  const normalized = query.toLowerCase().trim();
  return aliasMap.get(normalized) || null;
}

/**
 * Get node info by type
 */
export function getNodeInfo(nodeType: NodeType): NodeInfo | null {
  return NODE_REGISTRY[nodeType] || null;
}

/**
 * List available nodes by category
 */
export function listNodesByCategory(
  category?: NodeInfo["category"],
): NodeInfo[] {
  const nodes = Object.values(NODE_REGISTRY).filter(
    (n) => n.type !== NodeType.INITIAL,
  );
  if (category) {
    return nodes.filter((n) => n.category === category);
  }
  return nodes;
}

/**
 * Generate compact node list for AI (minimal tokens)
 */
export function getCompactNodeList(): string {
  const categories = [
    "trigger",
    "ai",
    "messaging",
    "google",
    "productivity",
    "logic",
  ] as const;
  const lines: string[] = [];

  categories.forEach((cat) => {
    const nodes = listNodesByCategory(cat);
    if (nodes.length > 0) {
      lines.push(
        `${cat.toUpperCase()}: ${nodes.map((n) => n.type).join(", ")}`,
      );
    }
  });

  return lines.join("\n");
}

/**
 * Check if a node type is a trigger
 */
export function isTriggerNode(nodeType: NodeType): boolean {
  const info = NODE_REGISTRY[nodeType];
  return info?.category === "trigger";
}

/**
 * Get count of implemented nodes
 */
export function getImplementedNodeCount(): number {
  return Object.keys(NODE_REGISTRY).length - 1; // Exclude INITIAL
}
