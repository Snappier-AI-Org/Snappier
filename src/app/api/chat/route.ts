import { streamText, convertToModelMessages } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { NodeType } from "@/generated/prisma";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import {
  getCompactNodeList,
  isTriggerNode,
} from "@/features/editor/utils/node-registry";

export async function POST(req: Request) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session) {
      return new Response("Unauthorized", { status: 401 });
    }

    const body = await req.json();
    const workflowState = body.workflowState || { nodes: [], edges: [] };
    const messages = body.messages || body;

    if (!Array.isArray(messages)) {
      return new Response("Invalid request: messages array is required", { status: 400 });
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: "OpenAI API key is not configured." }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    const openai = createOpenAI({ apiKey });

    // Compact workflow state (~100 tokens max)
    const nodes = workflowState.nodes || [];
    const edges = workflowState.edges || [];
    
    const existingTrigger = nodes.find((n: { type: string }) => isTriggerNode(n.type as NodeType));
    
    const workflowSummary = nodes.length > 0
      ? `Workflow: ${nodes.map((n: { type: string }) => n.type).join(" → ")}${existingTrigger ? ` (has trigger: ${existingTrigger.type})` : ""}`
      : "Empty workflow";

    // OPTIMIZED system prompt (~500 tokens vs ~6000 before = 92% reduction!)
    const systemPrompt = `You are a workflow assistant. BUILD workflows using action markers.

${workflowSummary}

NODES:
${getCompactNodeList()}

ACTIONS (use these to execute):
- Add: [ACTION:ADD_NODE:TYPE] (e.g., [ACTION:ADD_NODE:TELEGRAM])
- Connect: [ACTION:CONNECT_NODES:source:target] (use "last", "previous", "previous2", or TYPE names)
- Configure: [ACTION:CONFIGURE_NODE:nodeRef:{"key":"value"}]

RULES:
1. When user wants something, ADD nodes and CONNECT them immediately
2. Only 1 trigger per workflow - use existing if present${existingTrigger ? ` (use ${existingTrigger.type})` : ""}
3. Connect in order: [ACTION:CONNECT_NODES:previous:last]
4. For branches (A→B and A→C): separate connect actions
5. Multiple same-type nodes: use previous, previous2, previous3, last

EXAMPLE - "Create telegram notification workflow":
[ACTION:ADD_NODE:MANUAL_TRIGGER] [ACTION:ADD_NODE:TELEGRAM] [ACTION:CONNECT_NODES:previous:last]
Done! Added trigger and Telegram node. Configure Telegram with botToken, chatId, content.

EXAMPLE - "Send to Discord AND Telegram when form submitted":
[ACTION:ADD_NODE:GOOGLE_FORM_TRIGGER] [ACTION:ADD_NODE:DISCORD] [ACTION:ADD_NODE:TELEGRAM] [ACTION:CONNECT_NODES:previous2:previous] [ACTION:CONNECT_NODES:previous2:last]
Done! Form trigger connected to both Discord and Telegram.

Be concise. Execute actions, then briefly confirm.`;

    const result = streamText({
      model: openai("gpt-5-mini"),
      system: systemPrompt,
      messages: convertToModelMessages(messages),
    });

    return result.toUIMessageStreamResponse();
  } catch (error) {
    console.error("[Chat API] Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";

    return new Response(
      JSON.stringify({ error: "Chat API Error", message: errorMessage }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
