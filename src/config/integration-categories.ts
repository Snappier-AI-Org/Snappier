import {
  Brain,
  CheckSquare,
  Code,
  Database,
  GitBranch,
  MessageSquare,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { CredentialType, NodeType } from "@/generated/prisma";

// ============================================================================
// INTEGRATION CATEGORY DEFINITIONS
// ============================================================================

export type IntegrationCategoryId =
  | "triggers"
  | "logic"
  | "ai"
  | "communication"
  | "data"
  | "productivity"
  | "developer";

export interface IntegrationCategory {
  id: IntegrationCategoryId;
  label: string;
  icon: LucideIcon;
  description: string;
  order: number;
}

export const INTEGRATION_CATEGORIES: Record<IntegrationCategoryId, IntegrationCategory> = {
  triggers: {
    id: "triggers",
    label: "Triggers",
    icon: Zap,
    description: "Events that start your workflow",
    order: 1,
  },
  logic: {
    id: "logic",
    label: "Logic",
    icon: GitBranch,
    description: "Flow control and data transformation",
    order: 2,
  },
  ai: {
    id: "ai",
    label: "AI",
    icon: Brain,
    description: "AI models and machine learning",
    order: 3,
  },
  communication: {
    id: "communication",
    label: "Communication",
    icon: MessageSquare,
    description: "Email, messaging, and notifications",
    order: 4,
  },
  data: {
    id: "data",
    label: "Data",
    icon: Database,
    description: "Spreadsheets, files, and storage",
    order: 5,
  },
  productivity: {
    id: "productivity",
    label: "Productivity",
    icon: CheckSquare,
    description: "Task management and documents",
    order: 6,
  },
  developer: {
    id: "developer",
    label: "Developer",
    icon: Code,
    description: "APIs and custom code",
    order: 7,
  },
};

// ============================================================================
// NODE TYPE TO CATEGORY MAPPING
// ============================================================================

export const NODE_CATEGORY_MAP: Partial<Record<NodeType, IntegrationCategoryId>> = {
  // === TRIGGERS ===
  [NodeType.MANUAL_TRIGGER]: "triggers",
  [NodeType.GOOGLE_FORM_TRIGGER]: "triggers",
  [NodeType.STRIPE_TRIGGER]: "triggers",
  [NodeType.GMAIL_TRIGGER]: "triggers",
  [NodeType.SCHEDULE_TRIGGER]: "triggers",
  [NodeType.WEBHOOK_TRIGGER]: "triggers",
  [NodeType.DISCORD_TRIGGER]: "triggers",
  [NodeType.INSTAGRAM_TRIGGER]: "triggers",

  // === LOGIC ===
  [NodeType.FILTER_CONDITIONAL]: "logic",
  [NodeType.DELAY_WAIT]: "logic",
  [NodeType.SWITCH]: "logic",
  [NodeType.CODE]: "logic",
  [NodeType.MERGE]: "logic",
  [NodeType.SPLIT]: "logic",
  [NodeType.LOOP]: "logic",
  [NodeType.SET]: "logic",
  [NodeType.ERROR_TRIGGER]: "logic",

  // === AI ===
  [NodeType.OPENAI]: "ai",
  [NodeType.ANTHROPIC]: "ai",
  [NodeType.GEMINI]: "ai",
  [NodeType.GROQ]: "ai",
  [NodeType.HUGGINGFACE]: "ai",
  [NodeType.OPENROUTER]: "ai",

  // === COMMUNICATION ===
  [NodeType.DISCORD]: "communication",
  [NodeType.SLACK]: "communication",
  [NodeType.TELEGRAM]: "communication",
  [NodeType.WHATSAPP]: "communication",
  [NodeType.ZALO]: "communication",
  [NodeType.INSTAGRAM_DM]: "communication",
  [NodeType.INSTAGRAM_COMMENT_REPLY]: "communication",
  [NodeType.GMAIL]: "communication",
  [NodeType.OUTLOOK]: "communication",

  // === DATA ===
  [NodeType.GOOGLE_SHEETS]: "data",
  [NodeType.GOOGLE_DRIVE]: "data",
  [NodeType.GOOGLE_CALENDAR]: "data",
  [NodeType.GOOGLE_DOCS]: "data",

  // === PRODUCTIVITY ===
  [NodeType.TRELLO]: "productivity",
  [NodeType.NOTION]: "productivity",
  [NodeType.GITHUB]: "productivity",
  [NodeType.TODOIST]: "productivity",

  // === DEVELOPER ===
  [NodeType.HTTP_REQUEST]: "developer",
};

// ============================================================================
// CREDENTIAL TYPE TO CATEGORY MAPPING
// ============================================================================

export const CREDENTIAL_CATEGORY_MAP: Partial<Record<CredentialType, IntegrationCategoryId>> = {
  // === AI ===
  [CredentialType.OPENAI]: "ai",
  [CredentialType.ANTHROPIC]: "ai",
  [CredentialType.GEMINI]: "ai",
  [CredentialType.GROQ]: "ai",
  [CredentialType.HUGGINGFACE]: "ai",
  [CredentialType.OPENROUTER]: "ai",

  // === COMMUNICATION ===
  [CredentialType.DISCORD]: "communication",
  [CredentialType.TELEGRAM]: "communication",
  [CredentialType.WHATSAPP]: "communication",
  [CredentialType.META_INSTAGRAM]: "communication",
  [CredentialType.TWILIO]: "communication",
  [CredentialType.SENDGRID]: "communication",
  [CredentialType.GMAIL]: "communication",
  [CredentialType.OUTLOOK]: "communication",

  // === DATA ===
  [CredentialType.GOOGLE_SHEETS]: "data",
  [CredentialType.GOOGLE_DRIVE]: "data",
  [CredentialType.GOOGLE_CALENDAR]: "data",
  [CredentialType.GOOGLE_DOCS]: "data",
  [CredentialType.AIRTABLE]: "data",
  [CredentialType.SUPABASE]: "data",
  [CredentialType.MYSQL]: "data",
  [CredentialType.POSTGRES]: "data",
  [CredentialType.MONGODB]: "data",
  [CredentialType.REDIS]: "data",
  [CredentialType.AWS]: "data",
  [CredentialType.DROPBOX]: "data",

  // === PRODUCTIVITY ===
  [CredentialType.TRELLO]: "productivity",
  [CredentialType.NOTION]: "productivity",
  [CredentialType.GITHUB]: "productivity",
  [CredentialType.TODOIST]: "productivity",
  [CredentialType.JIRA]: "productivity",
  [CredentialType.CLICKUP]: "productivity",
  [CredentialType.ASANA]: "productivity",
  [CredentialType.LINEAR]: "productivity",
  [CredentialType.TYPEFORM]: "productivity",
  [CredentialType.MICROSOFT]: "productivity",

  // === SALES ===
  [CredentialType.HUBSPOT]: "productivity",
  [CredentialType.SALESFORCE]: "productivity",
  [CredentialType.PIPEDRIVE]: "productivity",
  [CredentialType.PAYPAL]: "productivity",
};

// ============================================================================
// OAUTH CREDENTIAL TYPES
// ============================================================================

export const OAUTH_CREDENTIAL_TYPES: CredentialType[] = [
  CredentialType.GOOGLE_DRIVE,
  CredentialType.GOOGLE_SHEETS,
  CredentialType.GMAIL,
  CredentialType.GOOGLE_CALENDAR,
  CredentialType.GOOGLE_DOCS,
  CredentialType.OUTLOOK,
  CredentialType.NOTION,
  CredentialType.GITHUB,
  CredentialType.TODOIST,
  CredentialType.META_INSTAGRAM,
];

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get the category for a node type
 */
export function getNodeCategory(nodeType: NodeType): IntegrationCategoryId | null {
  return NODE_CATEGORY_MAP[nodeType] || null;
}

/**
 * Get the category for a credential type
 */
export function getCredentialCategory(credentialType: CredentialType): IntegrationCategoryId | null {
  return CREDENTIAL_CATEGORY_MAP[credentialType] || null;
}

/**
 * Check if a credential type uses OAuth
 */
export function isOAuthCredential(credentialType: CredentialType): boolean {
  return OAUTH_CREDENTIAL_TYPES.includes(credentialType);
}

/**
 * Get categories in display order
 */
export function getCategoriesInOrder(): IntegrationCategory[] {
  return Object.values(INTEGRATION_CATEGORIES).sort((a, b) => a.order - b.order);
}

/**
 * Get categories that have credentials (excludes triggers, logic)
 */
export function getCredentialCategories(): IntegrationCategory[] {
  return getCategoriesInOrder().filter(
    (cat) => !["triggers", "logic"].includes(cat.id)
  );
}
