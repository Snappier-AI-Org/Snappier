import prisma from "@/lib/db";

export type ConversationMessage = {
  role: "user" | "assistant";
  content: string;
  timestamp: string;
};

/**
 * Get conversation history for a specific user within a workflow
 */
export async function getConversationHistory(
  workflowId: string,
  instagramUserId: string,
  limit = 20
): Promise<ConversationMessage[]> {
  const messages = await prisma.chatMessage.findMany({
    where: {
      workflowId,
      // Store instagramUserId in parts JSON field
      parts: {
        path: ["instagramUserId"],
        equals: instagramUserId,
      },
    },
    orderBy: {
      createdAt: "desc",
    },
    take: limit,
  });

  // Convert to ConversationMessage format and reverse to get chronological order
  return messages.reverse().map((msg) => ({
    role: msg.role as "user" | "assistant",
    content: msg.content,
    timestamp: msg.createdAt.toISOString(),
  }));
}

/**
 * Save a new message to the conversation history
 */
export async function saveMessage(
  workflowId: string,
  instagramUserId: string,
  role: "user" | "assistant",
  content: string
): Promise<void> {
  await prisma.chatMessage.create({
    data: {
      workflowId,
      role,
      content,
      parts: {
        instagramUserId, // Store instagramUserId in parts for filtering
      },
    },
  });
}

/**
 * Save user message to conversation history
 */
export async function saveUserMessage(
  workflowId: string,
  instagramUserId: string,
  content: string
): Promise<void> {
  return saveMessage(workflowId, instagramUserId, "user", content);
}

/**
 * Save assistant (AI) response to conversation history
 */
export async function saveAssistantMessage(
  workflowId: string,
  instagramUserId: string,
  content: string
): Promise<void> {
  return saveMessage(workflowId, instagramUserId, "assistant", content);
}

/**
 * Clear conversation history for a specific user
 */
export async function clearConversation(
  workflowId: string,
  instagramUserId: string
): Promise<void> {
  await prisma.chatMessage.deleteMany({
    where: {
      workflowId,
      parts: {
        path: ["instagramUserId"],
        equals: instagramUserId,
      },
    },
  }).catch(() => {
    // Ignore if not found
  });
}

/**
 * Get all conversations for a workflow
 */
export async function getWorkflowConversations(
  workflowId: string
): Promise<Array<{
  instagramUserId: string;
  messageCount: number;
  lastMessageAt: Date;
}>> {
  // Get all messages for this workflow
  const messages = await prisma.chatMessage.findMany({
    where: { 
      workflowId,
    },
    select: {
      parts: true,
      createdAt: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  // Group messages by instagramUserId
  const conversationsMap = new Map<string, { messageCount: number; lastMessageAt: Date }>();
  
  for (const msg of messages) {
    const instagramUserId = (msg.parts as any)?.instagramUserId;
    if (!instagramUserId) continue;
    
    if (!conversationsMap.has(instagramUserId)) {
      conversationsMap.set(instagramUserId, {
        messageCount: 0,
        lastMessageAt: msg.createdAt,
      });
    }
    
    const conv = conversationsMap.get(instagramUserId)!;
    conv.messageCount++;
    
    // Update last message time if this message is more recent
    if (msg.createdAt > conv.lastMessageAt) {
      conv.lastMessageAt = msg.createdAt;
    }
  }

  // Convert map to array
  return Array.from(conversationsMap.entries()).map(([instagramUserId, data]) => ({
    instagramUserId,
    ...data,
  })).sort((a, b) => b.lastMessageAt.getTime() - a.lastMessageAt.getTime());
}

/**
 * Format conversation history for AI context
 * Returns messages in a format suitable for OpenAI/Anthropic/Gemini chat completions
 */
export function formatForAI(
  messages: ConversationMessage[]
): Array<{ role: "user" | "assistant"; content: string }> {
  return messages.map((msg) => ({
    role: msg.role,
    content: msg.content,
  }));
}

