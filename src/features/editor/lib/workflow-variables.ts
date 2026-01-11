import type { Node } from "@xyflow/react";
import { NodeType } from "@/generated/prisma";

export type VariableToken = {
  token: string;
  label?: string;
  description?: string;
};

export type WorkflowVariableGroup = {
  nodeId: string;
  nodeLabel: string;
  variableName?: string;
  nodeType?: string;
  variables: VariableToken[];
};

const NODE_LABELS: Partial<Record<NodeType, string>> = {
  [NodeType.INITIAL]: "Start",
  [NodeType.MANUAL_TRIGGER]: "Manual Trigger",
  [NodeType.GOOGLE_FORM_TRIGGER]: "Google Form",
  [NodeType.STRIPE_TRIGGER]: "Stripe",
  [NodeType.GMAIL_TRIGGER]: "Gmail Trigger",
  [NodeType.DISCORD_TRIGGER]: "Discord Trigger",
  [NodeType.INSTAGRAM_TRIGGER]: "Instagram Trigger",
  [NodeType.INSTAGRAM_DM_TRIGGER]: "Instagram DM Trigger",
  [NodeType.INSTAGRAM_COMMENT_TRIGGER]: "Instagram Comment Trigger",
  [NodeType.HTTP_REQUEST]: "HTTP Request",
  [NodeType.GEMINI]: "Gemini",
  [NodeType.OPENAI]: "OpenAI",
  [NodeType.ANTHROPIC]: "Anthropic",
  [NodeType.GROQ]: "Groq",
  [NodeType.HUGGINGFACE]: "Hugging Face",
  [NodeType.OPENROUTER]: "OpenRouter",
  [NodeType.DISCORD]: "Discord",
  [NodeType.SLACK]: "Slack",
  [NodeType.TELEGRAM]: "Telegram",
  [NodeType.ZALO]: "Zalo Bot",
  [NodeType.GOOGLE_DRIVE]: "Google Drive",
  [NodeType.GMAIL]: "Gmail",
  [NodeType.GOOGLE_SHEETS]: "Google Sheets",
  [NodeType.GOOGLE_CALENDAR]: "Google Calendar",
  [NodeType.GOOGLE_DOCS]: "Google Docs",
  [NodeType.TRELLO]: "Trello",
  [NodeType.OUTLOOK]: "Outlook",
  [NodeType.NOTION]: "Notion",
  [NodeType.GITHUB]: "GitHub",
  [NodeType.TODOIST]: "Todoist",
  [NodeType.FILTER_CONDITIONAL]: "Filter / Conditional",
  [NodeType.DELAY_WAIT]: "Delay / Wait",
  [NodeType.LOOP]: "Loop",
};

const GOOGLE_FORM_VARIABLES: VariableToken[] = [
  {
    token: "{{googleForm.formId}}",
    label: "Form ID",
    description: "Unique identifier of the Google Form",
  },
  {
    token: "{{googleForm.formTitle}}",
    label: "Form Title",
    description: "Title of the Google Form",
  },
  {
    token: "{{googleForm.responseId}}",
    label: "Response ID",
    description: "Unique identifier for this specific response",
  },
  {
    token: "{{googleForm.respondentEmail}}",
    label: "Respondent Email",
    description: "Respondent's email address",
  },
  {
    token: "{{googleForm.timestamp}}",
    label: "Timestamp",
    description: "Submission timestamp",
  },
  {
    token: "{{googleForm.responses['Question Name']}}",
    label: "Specific Answer",
    description: "Answer to a specific question (replace 'Question Name')",
  },
  {
    token: "{{json googleForm.responses}}",
    label: "All Responses JSON",
    description: "All question-answer pairs as JSON",
  },
  {
    token: "{{json googleForm.raw}}",
    label: "Raw Payload",
    description: "Original unprocessed payload from Google Form",
  },
  {
    token: "{{json googleForm}}",
    label: "Full Payload",
    description: "Complete Google Form data object",
  },
];

const STRIPE_VARIABLES: VariableToken[] = [
  {
    token: "{{stripe.eventType}}",
    label: "Event type",
    description: "Stripe event type (e.g. payment_intent.succeeded)",
  },
  {
    token: "{{stripe.eventId}}",
    label: "Event ID",
    description: "Unique event identifier",
  },
  {
    token: "{{stripe.timestamp}}",
    label: "Timestamp",
    description: "Event timestamp",
  },
  {
    token: "{{stripe.livemode}}",
    label: "Live mode",
    description: "Indicates if the event happened in live mode",
  },
  {
    token: "{{json stripe.raw}}",
    label: "Event JSON",
    description: "Full Stripe event payload",
  },
];

const GMAIL_TRIGGER_VARIABLES: VariableToken[] = [
  {
    token: "{{gmailTrigger.email.from}}",
    label: "From",
    description: "Sender's email address",
  },
  {
    token: "{{gmailTrigger.email.to}}",
    label: "To",
    description: "Recipient's email address",
  },
  {
    token: "{{gmailTrigger.email.subject}}",
    label: "Subject",
    description: "Email subject line",
  },
  {
    token: "{{gmailTrigger.email.body}}",
    label: "Body",
    description: "Email body (text or HTML)",
  },
  {
    token: "{{gmailTrigger.email.bodyText}}",
    label: "Body (Text)",
    description: "Plain text email body",
  },
  {
    token: "{{gmailTrigger.email.snippet}}",
    label: "Snippet",
    description: "Short preview of the email",
  },
  {
    token: "{{gmailTrigger.email.id}}",
    label: "Message ID",
    description: "Gmail message ID",
  },
  {
    token: "{{gmailTrigger.email.threadId}}",
    label: "Thread ID",
    description: "Gmail thread ID",
  },
  {
    token: "{{gmailTrigger.email.date}}",
    label: "Date",
    description: "Email received date",
  },
  {
    token: "{{gmailTrigger.timestamp}}",
    label: "Trigger Timestamp",
    description: "When the trigger fired",
  },
  {
    token: "{{json gmailTrigger.email}}",
    label: "Full Email JSON",
    description: "Complete email object as JSON",
  },
];

// Discord Trigger Variables
const DISCORD_TRIGGER_VARIABLES: VariableToken[] = [
  {
    token: "{{discordMessage.content}}",
    label: "Message Content",
    description: "Raw message content",
  },
  {
    token: "{{discordMessage.messageId}}",
    label: "Message ID",
    description: "Unique identifier for the message",
  },
  {
    token: "{{discordMessage.channelId}}",
    label: "Channel ID",
    description: "Channel where the message was sent (empty for DM)",
  },
  {
    token: "{{discordMessage.guildId}}",
    label: "Guild ID",
    description: "Guild/server ID (empty for DMs)",
  },
  {
    token: "{{discordMessage.authorId}}",
    label: "Author ID",
    description: "User ID of the sender",
  },
  {
    token: "{{discordMessage.authorUsername}}",
    label: "Author Username",
    description: "Username of the sender",
  },
  {
    token: "{{discordMessage.isBot}}",
    label: "Is Bot",
    description: "True if the sender is a bot",
  },
  {
    token: "{{discordMessage.isDM}}",
    label: "Is DM",
    description: "True if the message came from DM",
  },
  {
    token: "{{discordMessage.timestamp}}",
    label: "Timestamp",
    description: "When the message was sent",
  },
  {
    token: "{{json discordMessage}}",
    label: "Full JSON",
    description: "Complete Discord message payload",
  },
];

// Instagram DM Trigger Variables
const INSTAGRAM_DM_TRIGGER_VARIABLES: VariableToken[] = [
  {
    token: "{{instagramDM.senderId}}",
    label: "Sender ID",
    description: "Instagram user ID of the sender",
  },
  {
    token: "{{instagramDM.senderUsername}}",
    label: "Sender Username",
    description: "Instagram username of the sender",
  },
  {
    token: "{{instagramDM.messageText}}",
    label: "Message Text",
    description: "Content of the direct message",
  },
  {
    token: "{{instagramDM.messageId}}",
    label: "Message ID",
    description: "Unique identifier of the message",
  },
  {
    token: "{{instagramDM.timestamp}}",
    label: "Timestamp",
    description: "When the message was sent",
  },
  {
    token: "{{instagramDM.recipientId}}",
    label: "Recipient ID",
    description: "Instagram user ID of the recipient (your account)",
  },
  {
    token: "{{json instagramDM}}",
    label: "Full DM JSON",
    description: "Complete DM object as JSON",
  },
];

// Instagram Comment Trigger Variables
const INSTAGRAM_COMMENT_TRIGGER_VARIABLES: VariableToken[] = [
  {
    token: "{{instagramComment.commentId}}",
    label: "Comment ID",
    description: "Unique identifier of the comment",
  },
  {
    token: "{{instagramComment.text}}",
    label: "Comment Text",
    description: "Content of the comment",
  },
  {
    token: "{{instagramComment.commenterId}}",
    label: "Commenter ID",
    description: "Instagram user ID of the commenter",
  },
  {
    token: "{{instagramComment.commenterUsername}}",
    label: "Commenter Username",
    description: "Instagram username of the commenter",
  },
  {
    token: "{{instagramComment.mediaId}}",
    label: "Media ID",
    description: "ID of the post that was commented on",
  },
  {
    token: "{{instagramComment.mediaType}}",
    label: "Media Type",
    description: "Type of media (IMAGE, VIDEO, CAROUSEL_ALBUM)",
  },
  {
    token: "{{instagramComment.timestamp}}",
    label: "Timestamp",
    description: "When the comment was posted",
  },
  {
    token: "{{instagramComment.parentCommentId}}",
    label: "Parent Comment ID",
    description: "ID of parent comment (if this is a reply)",
  },
  {
    token: "{{json instagramComment}}",
    label: "Full Comment JSON",
    description: "Complete comment object as JSON",
  },
];

const createHttpRequestVariables = (variableName: string): VariableToken[] => [
  {
    token: `{{${variableName}.httpResponse.status}}`,
    label: "Status",
    description: "HTTP status code",
  },
  {
    token: `{{${variableName}.httpResponse.statusText}}`,
    label: "Status text",
    description: "HTTP status text",
  },
  {
    token: `{{${variableName}.httpResponse.data}}`,
    label: "Body",
    description: "Response body",
  },
  {
    token: `{{json ${variableName}.httpResponse}}`,
    label: "Response JSON",
    description: "Entire HTTP response object",
  },
];

const createAiTextVariables = (variableName: string): VariableToken[] => [
  {
    token: `{{${variableName}.text}}`,
    label: "Text",
    description: "Model output text",
  },
  {
    token: `{{json ${variableName}}}`,
    label: "Response JSON",
    description: "Full AI response as JSON",
  },
];

const createMessageVariables = (variableName: string): VariableToken[] => [
  {
    token: `{{${variableName}.messageContent}}`,
    label: "Message",
    description: "Message content that was sent",
  },
  {
    token: `{{json ${variableName}}}`,
    label: "Payload JSON",
    description: "Full message payload",
  },
];

const createTelegramVariables = (variableName: string): VariableToken[] => [
  {
    token: `{{${variableName}.messageContent}}`,
    label: "Message",
    description: "Message content that was sent",
  },
  {
    token: `{{${variableName}.messageId}}`,
    label: "Message ID",
    description: "Telegram message ID",
  },
  {
    token: `{{${variableName}.chatId}}`,
    label: "Chat ID",
    description: "Chat ID where message was sent",
  },
  {
    token: `{{json ${variableName}}}`,
    label: "Response JSON",
    description: "Full Telegram API response",
  },
];

const createWhatsAppVariables = (variableName: string): VariableToken[] => [
  {
    token: `{{${variableName}.messageContent}}`,
    label: "Message",
    description: "Message content that was sent",
  },
  {
    token: `{{${variableName}.messageId}}`,
    label: "Message ID",
    description: "WhatsApp message ID",
  },
  {
    token: `{{${variableName}.chatId}}`,
    label: "Chat ID",
    description: "Chat ID where message was sent",
  },
  {
    token: `{{${variableName}.phoneNumber}}`,
    label: "Phone Number",
    description: "Recipient phone number",
  },
  {
    token: `{{${variableName}.timestamp}}`,
    label: "Timestamp",
    description: "Message timestamp",
  },
  {
    token: `{{json ${variableName}}}`,
    label: "Response JSON",
    description: "Full WhatsApp response",
  },
];

const createZaloVariables = (variableName: string): VariableToken[] => [
  {
    token: `{{${variableName}.messageContent}}`,
    label: "Message",
    description: "Message content that was sent",
  },
  {
    token: `{{${variableName}.messageId}}`,
    label: "Message ID",
    description: "Zalo Bot message ID",
  },
  {
    token: `{{${variableName}.recipientId}}`,
    label: "Recipient ID",
    description: "Recipient ID where message was sent",
  },
  {
    token: `{{json ${variableName}}}`,
    label: "Response JSON",
    description: "Full Zalo Bot API response",
  },
];

const createGoogleDriveVariables = (variableName: string): VariableToken[] => [
  {
    token: `{{${variableName}.files}}`,
    label: "Files",
    description: "List of files (for list operation)",
  },
  {
    token: `{{${variableName}.file}}`,
    label: "File",
    description: "Single file object (for upload)",
  },
  {
    token: `{{${variableName}.content}}`,
    label: "Content",
    description: "Downloaded file content",
  },
  {
    token: `{{${variableName}.folder}}`,
    label: "Folder",
    description: "Created folder object",
  },
  {
    token: `{{json ${variableName}}}`,
    label: "Response JSON",
    description: "Full Google Drive response",
  },
];

const createGmailVariables = (variableName: string): VariableToken[] => [
  {
    token: `{{${variableName}.messages}}`,
    label: "Messages",
    description: "List of messages",
  },
  {
    token: `{{${variableName}.message}}`,
    label: "Message",
    description: "Single message object",
  },
  {
    token: `{{${variableName}.sent}}`,
    label: "Sent",
    description: "Sent message info",
  },
  {
    token: `{{${variableName}.message.id}}`,
    label: "Message ID",
    description: "Message ID for operations",
  },
  {
    token: `{{${variableName}.message.threadId}}`,
    label: "Thread ID",
    description: "Thread ID for replies",
  },
  {
    token: `{{json ${variableName}}}`,
    label: "Response JSON",
    description: "Full Gmail response",
  },
];

const createGoogleSheetsVariables = (variableName: string): VariableToken[] => [
  {
    token: `{{${variableName}.values}}`,
    label: "Values",
    description: "Read data from sheet",
  },
  {
    token: `{{${variableName}.updatedRows}}`,
    label: "Updated Rows",
    description: "Number of rows affected",
  },
  {
    token: `{{${variableName}.updatedRange}}`,
    label: "Updated Range",
    description: "Range that was modified",
  },
  {
    token: `{{json ${variableName}}}`,
    label: "Response JSON",
    description: "Full Google Sheets response",
  },
];

const createGoogleCalendarVariables = (
  variableName: string,
): VariableToken[] => [
  {
    token: `{{${variableName}.events}}`,
    label: "Events",
    description: "List of events",
  },
  {
    token: `{{${variableName}.event}}`,
    label: "Event",
    description: "Single event object",
  },
  {
    token: `{{${variableName}.created}}`,
    label: "Created",
    description: "Created event info",
  },
  {
    token: `{{${variableName}.calendars}}`,
    label: "Calendars",
    description: "List of calendars",
  },
  {
    token: `{{json ${variableName}}}`,
    label: "Response JSON",
    description: "Full Calendar response",
  },
];

const createGoogleDocsVariables = (variableName: string): VariableToken[] => [
  {
    token: `{{${variableName}.document}}`,
    label: "Document",
    description: "Document metadata",
  },
  {
    token: `{{${variableName}.content}}`,
    label: "Content",
    description: "Document text content",
  },
  {
    token: `{{${variableName}.created.documentId}}`,
    label: "Document ID",
    description: "Created document ID",
  },
  {
    token: `{{json ${variableName}}}`,
    label: "Response JSON",
    description: "Full Docs response",
  },
];

const createTrelloVariables = (variableName: string): VariableToken[] => [
  {
    token: `{{${variableName}.id}}`,
    label: "ID",
    description: "Card or object ID",
  },
  {
    token: `{{${variableName}.name}}`,
    label: "Name",
    description: "Card name",
  },
  {
    token: `{{${variableName}.url}}`,
    label: "URL",
    description: "Card URL",
  },
  {
    token: `{{${variableName}.cards}}`,
    label: "Cards",
    description: "Search results (array)",
  },
  {
    token: `{{json ${variableName}}}`,
    label: "Response JSON",
    description: "Full Trello response",
  },
];

const createTodoistVariables = (variableName: string): VariableToken[] => [
  {
    token: `{{${variableName}.id}}`,
    label: "ID",
    description: "Task or object ID",
  },
  {
    token: `{{${variableName}.content}}`,
    label: "Content",
    description: "Task content/title",
  },
  {
    token: `{{${variableName}.description}}`,
    label: "Description",
    description: "Task description",
  },
  {
    token: `{{${variableName}.project_id}}`,
    label: "Project ID",
    description: "ID of the task's project",
  },
  {
    token: `{{${variableName}.url}}`,
    label: "URL",
    description: "Task URL",
  },
  {
    token: `{{${variableName}.tasks}}`,
    label: "Tasks",
    description: "List of tasks (array)",
  },
  {
    token: `{{${variableName}.projects}}`,
    label: "Projects",
    description: "List of projects (array)",
  },
  {
    token: `{{${variableName}.labels}}`,
    label: "Labels",
    description: "List of labels (array)",
  },
  {
    token: `{{${variableName}.comments}}`,
    label: "Comments",
    description: "List of comments (array)",
  },
  {
    token: `{{json ${variableName}}}`,
    label: "Response JSON",
    description: "Full Todoist response",
  },
];

const createNotionVariables = (variableName: string): VariableToken[] => [
  {
    token: `{{${variableName}.results}}`,
    label: "Results",
    description: "Search or query results array",
  },
  {
    token: `{{${variableName}.page}}`,
    label: "Page",
    description: "Retrieved page object",
  },
  {
    token: `{{${variableName}.created}}`,
    label: "Created",
    description: "Created page/item object",
  },
  {
    token: `{{${variableName}.updated}}`,
    label: "Updated",
    description: "Updated page/item object",
  },
  {
    token: `{{${variableName}.archived}}`,
    label: "Archived",
    description: "Archived page object",
  },
  {
    token: `{{${variableName}.database}}`,
    label: "Database",
    description: "Retrieved database object",
  },
  {
    token: `{{${variableName}.blocks}}`,
    label: "Blocks",
    description: "Child blocks array",
  },
  {
    token: `{{${variableName}.appended}}`,
    label: "Appended",
    description: "Appended blocks result",
  },
  {
    token: `{{json ${variableName}}}`,
    label: "Response JSON",
    description: "Full Notion response",
  },
];

const createGithubVariables = (variableName: string): VariableToken[] => [
  {
    token: `{{${variableName}.operation}}`,
    label: "Operation",
    description: "The operation that was performed",
  },
  {
    token: `{{${variableName}.success}}`,
    label: "Success",
    description: "Whether the operation succeeded",
  },
  {
    token: `{{${variableName}.data}}`,
    label: "Data",
    description: "Operation result data (repos, issues, PRs, etc.)",
  },
  {
    token: `{{${variableName}.data.id}}`,
    label: "ID",
    description: "ID of the created/retrieved resource",
  },
  {
    token: `{{${variableName}.data.number}}`,
    label: "Number",
    description: "Issue or PR number",
  },
  {
    token: `{{${variableName}.data.title}}`,
    label: "Title",
    description: "Issue or PR title",
  },
  {
    token: `{{${variableName}.data.html_url}}`,
    label: "URL",
    description: "Web URL of the resource",
  },
  {
    token: `{{${variableName}.data.state}}`,
    label: "State",
    description: "State of issue/PR (open, closed)",
  },
  {
    token: `{{${variableName}.data.sha}}`,
    label: "SHA",
    description: "File SHA (for updates)",
  },
  {
    token: `{{${variableName}.data.decodedContent}}`,
    label: "File Content",
    description: "Decoded file content (for get_file_content)",
  },
  {
    token: `{{json ${variableName}}}`,
    label: "Response JSON",
    description: "Full GitHub response",
  },
];

const createFilterConditionalVariables = (
  variableName: string,
): VariableToken[] => [
  {
    token: `{{${variableName}.passed}}`,
    label: "Passed",
    description: "Whether all conditions passed (true/false)",
  },
  {
    token: `{{${variableName}.branch}}`,
    label: "Branch",
    description: "The branch taken ('true' or 'false')",
  },
  {
    token: `{{${variableName}.logicalOperator}}`,
    label: "Logical Operator",
    description: "The logical operator used (AND/OR)",
  },
  {
    token: `{{${variableName}.conditionResults}}`,
    label: "Condition Results",
    description: "Array of individual condition results",
  },
  {
    token: `{{json ${variableName}}}`,
    label: "Response JSON",
    description: "Full filter result",
  },
];

const createDelayWaitVariables = (variableName: string): VariableToken[] => [
  {
    token: `{{${variableName}.durationMs}}`,
    label: "Duration (ms)",
    description: "Total wait time in milliseconds",
  },
  {
    token: `{{${variableName}.amount}}`,
    label: "Amount",
    description: "Configured duration value",
  },
  {
    token: `{{${variableName}.unit}}`,
    label: "Unit",
    description: "Unit selected (seconds/minutes/hours/days)",
  },
  {
    token: `{{${variableName}.startedAt}}`,
    label: "Started At",
    description: "Timestamp when the wait began",
  },
  {
    token: `{{${variableName}.completedAt}}`,
    label: "Completed At",
    description: "Timestamp when the wait finished",
  },
  {
    token: `{{json ${variableName}}}`,
    label: "Delay JSON",
    description: "Full delay metadata",
  },
];

const createLoopVariables = (variableName: string): VariableToken[] => [
  {
    token: `{{${variableName}.currentItem}}`,
    label: "Current Item",
    description: "The current item being processed in the loop",
  },
  {
    token: `{{${variableName}.currentIndex}}`,
    label: "Current Index",
    description: "Zero-based index of the current iteration",
  },
  {
    token: `{{${variableName}.totalItems}}`,
    label: "Total Items",
    description: "Total number of items in the loop",
  },
  {
    token: `{{${variableName}.isFirst}}`,
    label: "Is First",
    description: "Boolean indicating if this is the first iteration",
  },
  {
    token: `{{${variableName}.isLast}}`,
    label: "Is Last",
    description: "Boolean indicating if this is the last iteration",
  },
  {
    token: `{{${variableName}.items}}`,
    label: "Items",
    description: "The full array of items being looped over",
  },
  {
    token: `{{${variableName}.mode}}`,
    label: "Mode",
    description: "Loop mode (forEach or times)",
  },
  {
    token: `{{json ${variableName}}}`,
    label: "Loop JSON",
    description: "Full loop metadata",
  },
];

const createOutlookVariables = (variableName: string): VariableToken[] => [
  {
    token: `{{${variableName}.messages}}`,
    label: "Messages",
    description: "List of emails",
  },
  {
    token: `{{${variableName}.message}}`,
    label: "Message",
    description: "Single email object",
  },
  {
    token: `{{${variableName}.sent}}`,
    label: "Sent",
    description: "Sent email info",
  },
  {
    token: `{{${variableName}.reply}}`,
    label: "Reply",
    description: "Reply result info",
  },
  {
    token: `{{${variableName}.forwarded}}`,
    label: "Forwarded",
    description: "Forward result info",
  },
  {
    token: `{{${variableName}.deleted}}`,
    label: "Deleted",
    description: "Delete result info",
  },
  {
    token: `{{${variableName}.updated}}`,
    label: "Updated",
    description: "Update result info",
  },
  {
    token: `{{${variableName}.message.id}}`,
    label: "Message ID",
    description: "Email ID for operations",
  },
  {
    token: `{{${variableName}.message.conversationId}}`,
    label: "Conversation ID",
    description: "Conversation ID for threading",
  },
  {
    token: `{{json ${variableName}}}`,
    label: "Response JSON",
    description: "Full Outlook response",
  },
];

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0;

const getNodeLabel = (type?: NodeType | string) => {
  if (!type) return "Node";
  if (Object.values(NodeType).includes(type as NodeType)) {
    return NODE_LABELS[type as NodeType] ?? (type as string);
  }
  return String(type);
};

const buildVariableGroup = (node: Node): WorkflowVariableGroup | null => {
  const type = node.type as NodeType | undefined;
  const data = (node.data ?? {}) as Record<string, unknown>;
  const variableName = isNonEmptyString(data.variableName)
    ? data.variableName.trim()
    : undefined;

  switch (type) {
    case NodeType.GOOGLE_FORM_TRIGGER:
      return {
        nodeId: node.id,
        nodeLabel: getNodeLabel(type),
        nodeType: type,
        variables: GOOGLE_FORM_VARIABLES,
      };
    case NodeType.STRIPE_TRIGGER:
      return {
        nodeId: node.id,
        nodeLabel: getNodeLabel(type),
        nodeType: type,
        variables: STRIPE_VARIABLES,
      };
    case NodeType.GMAIL_TRIGGER:
      return {
        nodeId: node.id,
        nodeLabel: getNodeLabel(type),
        nodeType: type,
        variables: GMAIL_TRIGGER_VARIABLES,
      };
    case NodeType.DISCORD_TRIGGER:
      return {
        nodeId: node.id,
        nodeLabel: getNodeLabel(type),
        nodeType: type,
        variables: DISCORD_TRIGGER_VARIABLES,
      };
    case NodeType.INSTAGRAM_DM_TRIGGER:
      return {
        nodeId: node.id,
        nodeLabel: getNodeLabel(type),
        nodeType: type,
        variables: INSTAGRAM_DM_TRIGGER_VARIABLES,
      };
    case NodeType.INSTAGRAM_COMMENT_TRIGGER:
      return {
        nodeId: node.id,
        nodeLabel: getNodeLabel(type),
        nodeType: type,
        variables: INSTAGRAM_COMMENT_TRIGGER_VARIABLES,
      };
    case NodeType.INSTAGRAM_TRIGGER: {
      // Combined trigger - show variables based on trigger type
      const triggerType = data.triggerType as string | undefined;
      if (triggerType === "dm") {
        return {
          nodeId: node.id,
          nodeLabel: getNodeLabel(type),
          nodeType: type,
          variables: INSTAGRAM_DM_TRIGGER_VARIABLES,
        };
      } else if (triggerType === "comment") {
        return {
          nodeId: node.id,
          nodeLabel: getNodeLabel(type),
          nodeType: type,
          variables: INSTAGRAM_COMMENT_TRIGGER_VARIABLES,
        };
      } else {
        // "both" - show both sets of variables
        return {
          nodeId: node.id,
          nodeLabel: getNodeLabel(type),
          nodeType: type,
          variables: [
            ...INSTAGRAM_DM_TRIGGER_VARIABLES,
            ...INSTAGRAM_COMMENT_TRIGGER_VARIABLES,
          ],
        };
      }
    }
    case NodeType.HTTP_REQUEST:
      if (!variableName) return null;
      return {
        nodeId: node.id,
        nodeLabel: getNodeLabel(type),
        nodeType: type,
        variableName,
        variables: createHttpRequestVariables(variableName),
      };
    case NodeType.GEMINI:
    case NodeType.OPENAI:
    case NodeType.ANTHROPIC:
    case NodeType.GROQ:
    case NodeType.HUGGINGFACE:
    case NodeType.OPENROUTER:
      if (!variableName) return null;
      return {
        nodeId: node.id,
        nodeLabel: getNodeLabel(type),
        nodeType: type,
        variableName,
        variables: createAiTextVariables(variableName),
      };
    case NodeType.DISCORD:
    case NodeType.SLACK:
      if (!variableName) return null;
      return {
        nodeId: node.id,
        nodeLabel: getNodeLabel(type),
        nodeType: type,
        variableName,
        variables: createMessageVariables(variableName),
      };
    case NodeType.TELEGRAM:
      if (!variableName) return null;
      return {
        nodeId: node.id,
        nodeLabel: getNodeLabel(type),
        nodeType: type,
        variableName,
        variables: createTelegramVariables(variableName),
      };
    case NodeType.WHATSAPP:
      if (!variableName) return null;
      return {
        nodeId: node.id,
        nodeLabel: getNodeLabel(type),
        nodeType: type,
        variableName,
        variables: createWhatsAppVariables(variableName),
      };
    case NodeType.ZALO:
      if (!variableName) return null;
      return {
        nodeId: node.id,
        nodeLabel: getNodeLabel(type),
        nodeType: type,
        variableName,
        variables: createZaloVariables(variableName),
      };
    case NodeType.GOOGLE_DRIVE:
      if (!variableName) return null;
      return {
        nodeId: node.id,
        nodeLabel: getNodeLabel(type),
        nodeType: type,
        variableName,
        variables: createGoogleDriveVariables(variableName),
      };
    case NodeType.GMAIL:
      if (!variableName) return null;
      return {
        nodeId: node.id,
        nodeLabel: getNodeLabel(type),
        nodeType: type,
        variableName,
        variables: createGmailVariables(variableName),
      };
    case NodeType.GOOGLE_SHEETS:
      if (!variableName) return null;
      return {
        nodeId: node.id,
        nodeLabel: getNodeLabel(type),
        nodeType: type,
        variableName,
        variables: createGoogleSheetsVariables(variableName),
      };
    case NodeType.GOOGLE_CALENDAR:
      if (!variableName) return null;
      return {
        nodeId: node.id,
        nodeLabel: getNodeLabel(type),
        nodeType: type,
        variableName,
        variables: createGoogleCalendarVariables(variableName),
      };
    case NodeType.GOOGLE_DOCS:
      if (!variableName) return null;
      return {
        nodeId: node.id,
        nodeLabel: getNodeLabel(type),
        nodeType: type,
        variableName,
        variables: createGoogleDocsVariables(variableName),
      };
    case NodeType.TRELLO:
      if (!variableName) return null;
      return {
        nodeId: node.id,
        nodeLabel: getNodeLabel(type),
        nodeType: type,
        variableName,
        variables: createTrelloVariables(variableName),
      };
    case NodeType.OUTLOOK:
      if (!variableName) return null;
      return {
        nodeId: node.id,
        nodeLabel: getNodeLabel(type),
        nodeType: type,
        variableName,
        variables: createOutlookVariables(variableName),
      };
    case NodeType.NOTION:
      if (!variableName) return null;
      return {
        nodeId: node.id,
        nodeLabel: getNodeLabel(type),
        nodeType: type,
        variableName,
        variables: createNotionVariables(variableName),
      };
    case NodeType.GITHUB:
      if (!variableName) return null;
      return {
        nodeId: node.id,
        nodeLabel: getNodeLabel(type),
        nodeType: type,
        variableName,
        variables: createGithubVariables(variableName),
      };
    case NodeType.TODOIST:
      if (!variableName) return null;
      return {
        nodeId: node.id,
        nodeLabel: getNodeLabel(type),
        nodeType: type,
        variableName,
        variables: createTodoistVariables(variableName),
      };
    case NodeType.DELAY_WAIT:
      return {
        nodeId: node.id,
        nodeLabel: getNodeLabel(type),
        nodeType: type,
        variableName: variableName || "delay",
        variables: createDelayWaitVariables(variableName || "delay"),
      };
    case NodeType.FILTER_CONDITIONAL:
      if (!variableName) return null;
      return {
        nodeId: node.id,
        nodeLabel: getNodeLabel(type),
        nodeType: type,
        variableName,
        variables: createFilterConditionalVariables(variableName),
      };
    case NodeType.LOOP:
      return {
        nodeId: node.id,
        nodeLabel: getNodeLabel(type),
        nodeType: type,
        variableName: variableName || "loop",
        variables: createLoopVariables(variableName || "loop"),
      };
    default:
      return null;
  }
};

export const getWorkflowVariables = (nodes: Node[]): WorkflowVariableGroup[] =>
  nodes
    .map((node) => buildVariableGroup(node))
    .filter((group): group is WorkflowVariableGroup =>
      Boolean(group?.variables.length),
    );

export const getGoogleFormVariables = () => GOOGLE_FORM_VARIABLES;
export const getStripeVariables = () => STRIPE_VARIABLES;
export const getGmailTriggerVariables = () => GMAIL_TRIGGER_VARIABLES;
export const getDiscordTriggerVariables = () => DISCORD_TRIGGER_VARIABLES;
export const getInstagramDmTriggerVariables = () =>
  INSTAGRAM_DM_TRIGGER_VARIABLES;
export const getInstagramCommentTriggerVariables = () =>
  INSTAGRAM_COMMENT_TRIGGER_VARIABLES;
export const getHttpRequestVariables = (variableName: string) =>
  createHttpRequestVariables(variableName);
export const getAiVariables = (variableName: string) =>
  createAiTextVariables(variableName);
export const getMessageVariables = (variableName: string) =>
  createMessageVariables(variableName);
export const getTelegramVariables = (variableName: string) =>
  createTelegramVariables(variableName);
export const getWhatsAppVariables = (variableName: string) =>
  createWhatsAppVariables(variableName);
export const getZaloVariables = (variableName: string) =>
  createZaloVariables(variableName);
export const getGoogleDriveVariables = (variableName: string) =>
  createGoogleDriveVariables(variableName);
export const getGmailVariables = (variableName: string) =>
  createGmailVariables(variableName);
export const getGoogleSheetsVariables = (variableName: string) =>
  createGoogleSheetsVariables(variableName);
export const getGoogleCalendarVariables = (variableName: string) =>
  createGoogleCalendarVariables(variableName);
export const getGoogleDocsVariables = (variableName: string) =>
  createGoogleDocsVariables(variableName);
export const getTrelloVariables = (variableName: string) =>
  createTrelloVariables(variableName);
export const getTodoistVariables = (variableName: string) =>
  createTodoistVariables(variableName);
export const getOutlookVariables = (variableName: string) =>
  createOutlookVariables(variableName);
export const getNotionVariables = (variableName: string) =>
  createNotionVariables(variableName);
export const getGithubVariables = (variableName: string) =>
  createGithubVariables(variableName);
export const getFilterConditionalVariables = (variableName: string) =>
  createFilterConditionalVariables(variableName);
export const getDelayWaitVariables = (variableName: string) =>
  createDelayWaitVariables(variableName);
export const getLoopVariables = (variableName: string) =>
  createLoopVariables(variableName);
