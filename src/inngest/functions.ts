import { NonRetriableError } from "inngest";
import { getExecutor } from "@/features/executions/lib/executor-registry";
import { ExecutionStatus, NodeType } from "@/generated/prisma";
import prisma from "@/lib/db";
import { anthropicChannel } from "./channels/anthropic";
import { codeChannel } from "./channels/code";
import { delayWaitChannel } from "./channels/delay-wait";
import { discordChannel } from "./channels/discord";
import { discordTriggerChannel } from "./channels/discord-trigger";
import { errorTriggerChannel } from "./channels/error-trigger";
import { filterConditionalChannel } from "./channels/filter-conditional";
import { geminiChannel } from "./channels/gemini";
import { gmailTriggerChannel } from "./channels/gmail-trigger";
import { googleDocsChannel } from "./channels/google-docs";
import { googleDriveChannel } from "./channels/google-drive";
import { googleFormTriggerChannel } from "./channels/google-form-trigger";
import { googleSheetsChannel } from "./channels/google-sheets";
import { httpRequestChannel } from "./channels/http-request";
import { instagramCommentReplyChannel } from "./channels/instagram-comment-reply";
import { instagramCommentTriggerChannel } from "./channels/instagram-comment-trigger";
import { instagramDmChannel } from "./channels/instagram-dm";
import { instagramDmTriggerChannel } from "./channels/instagram-dm-trigger";
import { instagramTriggerChannel } from "./channels/instagram-trigger";
import { loopChannel } from "./channels/loop";
import { manualTriggerChannel } from "./channels/manual-trigger";
import { mergeChannel } from "./channels/merge";
import { notionChannel } from "./channels/notion";
import { openAiChannel } from "./channels/openai";
import { outlookChannel } from "./channels/outlook";
import { scheduleTriggerChannel } from "./channels/schedule-trigger";
import { setChannel } from "./channels/set";
import { slackChannel } from "./channels/slack";
import { splitChannel } from "./channels/split";
import { stripeTriggerChannel } from "./channels/stripe-trigger";
import { switchChannel } from "./channels/switch";
import { telegramChannel } from "./channels/telegram";
import { trelloChannel } from "./channels/trello";
import { todoistChannel } from "./channels/todoist";
import { webhookTriggerChannel } from "./channels/webhook-trigger";
import { inngest } from "./client";
import { topologicalSort } from "./utils";

// All trigger node types as strings for comparison
const TRIGGER_NODE_TYPES: Set<string> = new Set([
  NodeType.MANUAL_TRIGGER,
  NodeType.GOOGLE_FORM_TRIGGER,
  NodeType.STRIPE_TRIGGER,
  NodeType.GMAIL_TRIGGER,
  NodeType.SCHEDULE_TRIGGER,
  NodeType.WEBHOOK_TRIGGER,
  NodeType.DISCORD_TRIGGER,
  NodeType.INSTAGRAM_TRIGGER,
  NodeType.INSTAGRAM_DM_TRIGGER,
  NodeType.INSTAGRAM_COMMENT_TRIGGER,
]);

// Helper to check if a node type is a trigger
function isTriggerNode(nodeType: string): boolean {
  return TRIGGER_NODE_TYPES.has(nodeType);
}

// Helper to determine which trigger node initiated the workflow
function getActiveTriggerNodeId(
  initialData: Record<string, unknown>,
): string | null {
  // Check for scheduleTrigger (includes nodeId from schedule-poller)
  if (
    initialData.scheduleTrigger &&
    typeof initialData.scheduleTrigger === "object"
  ) {
    const scheduleTrigger = initialData.scheduleTrigger as { nodeId?: string };
    if (scheduleTrigger.nodeId) return scheduleTrigger.nodeId;
  }

  // Check for gmailTrigger (includes nodeId from gmail webhook)
  if (
    initialData.gmailTrigger &&
    typeof initialData.gmailTrigger === "object"
  ) {
    const gmailTrigger = initialData.gmailTrigger as { nodeId?: string };
    if (gmailTrigger.nodeId) return gmailTrigger.nodeId;
  }

  // Check for googleForm (from google-form webhook - no nodeId yet)
  if (initialData.googleForm && typeof initialData.googleForm === "object") {
    const formTrigger = initialData.googleForm as { nodeId?: string };
    if (formTrigger.nodeId) return formTrigger.nodeId;
  }

  // Check for stripe (from stripe webhook - no nodeId yet)
  if (initialData.stripe && typeof initialData.stripe === "object") {
    const stripeTrigger = initialData.stripe as { nodeId?: string };
    if (stripeTrigger.nodeId) return stripeTrigger.nodeId;
  }

  // Check for generic webhook trigger
  if (initialData.webhook && typeof initialData.webhook === "object") {
    const webhookTrigger = initialData.webhook as { nodeId?: string };
    if (webhookTrigger.nodeId) return webhookTrigger.nodeId;
  }

  // Check for Instagram DM trigger (legacy or combined trigger)
  if (initialData.instagramDM && typeof initialData.instagramDM === "object") {
    const instagramDmTrigger = initialData.instagramDM as { nodeId?: string };
    if (instagramDmTrigger.nodeId) return instagramDmTrigger.nodeId;
  }

  // Check for Discord trigger
  if (
    initialData.discordMessage &&
    typeof initialData.discordMessage === "object"
  ) {
    const discordTrigger = initialData.discordMessage as { nodeId?: string };
    if (discordTrigger.nodeId) return discordTrigger.nodeId;
  }

  // Check for Instagram Comment trigger (legacy or combined trigger)
  if (
    initialData.instagramComment &&
    typeof initialData.instagramComment === "object"
  ) {
    const instagramCommentTrigger = initialData.instagramComment as {
      nodeId?: string;
    };
    if (instagramCommentTrigger.nodeId) return instagramCommentTrigger.nodeId;
  }

  // Check for combined Instagram trigger
  if (initialData.instagram && typeof initialData.instagram === "object") {
    const instagramTrigger = initialData.instagram as { nodeId?: string };
    if (instagramTrigger.nodeId) return instagramTrigger.nodeId;
  }

  // No specific trigger identified (likely manual trigger or legacy format without nodeId)
  return null;
}

type FilterBranchMeta = { nodeId?: string; passed?: boolean };

export const executeWorkflow = inngest.createFunction(
  {
    id: "execute-workflow",
    retries: process.env.NODE_ENV === "production" ? 3 : 0,
    onFailure: async ({ event, error }) => {
      // In onFailure, the original event is nested in event.data.event
      const originalEvent = event.data.event;
      const inngestEventId = originalEvent?.id;
      const workflowId = originalEvent?.data?.workflowId;

      console.error(`[Workflow Execution] onFailure handler triggered:`, {
        eventId: inngestEventId,
        workflowId,
        error: error,
        errorMessage: error?.message,
        errorStack: error?.stack,
      });

      if (!workflowId || !inngestEventId) {
        console.error(
          `[Workflow Execution] No workflowId or inngestEventId in onFailure event`,
        );
        return;
      }

      try {
        const updated = await prisma.execution.update({
          where: { inngestEventId, workflowId },
          data: {
            status: ExecutionStatus.FAILED,
            error: error?.message || "Unknown error occurred",
            errorStack: error?.stack || undefined,
          },
        });
        console.log(`[Workflow Execution] onFailure handler saved error:`, {
          executionId: updated.id,
          error: updated.error,
        });
        return updated;
      } catch (updateError) {
        console.error(
          `[Workflow Execution] Failed to update execution in onFailure handler:`,
          updateError,
        );
        // Try to create execution record if update fails (execution might not have been created yet)
        try {
          const created = await prisma.execution.create({
            data: {
              workflowId,
              inngestEventId,
              status: ExecutionStatus.FAILED,
              error: error?.message || "Unknown error occurred",
              errorStack: error?.stack || undefined,
            },
          });
          console.log(
            `[Workflow Execution] Created execution record in onFailure handler:`,
            {
              executionId: created.id,
            },
          );
          return created;
        } catch (createError) {
          console.error(
            `[Workflow Execution] Failed to create execution in onFailure handler:`,
            createError,
          );
          throw createError;
        }
      }
    },
  },
  {
    event: "workflows/execute.workflow",
    channels: [
      httpRequestChannel(),
      manualTriggerChannel(),
      googleFormTriggerChannel(),
      stripeTriggerChannel(),
      gmailTriggerChannel(),
      scheduleTriggerChannel(),
      webhookTriggerChannel(),
      instagramTriggerChannel(),
      instagramDmTriggerChannel(),
      instagramCommentTriggerChannel(),
      discordTriggerChannel(),
      geminiChannel(),
      openAiChannel(),
      anthropicChannel(),
      discordChannel(),
      slackChannel(),
      telegramChannel(),
      instagramDmChannel(),
      instagramCommentReplyChannel(),
      googleSheetsChannel(),
      googleDriveChannel(),
      googleDocsChannel(),
      trelloChannel(),
      todoistChannel(),
      outlookChannel(),
      notionChannel(),
      delayWaitChannel(),
      filterConditionalChannel(),
      switchChannel(),
      codeChannel(),
      mergeChannel(),
      splitChannel(),
      loopChannel(),
      setChannel(),
      errorTriggerChannel(),
    ],
  }, // to exe this function
  async ({ event, step, publish }) => {
    const inngestEventId = event.id;
    const workflowId = event.data.workflowId;

    if (!inngestEventId || !workflowId) {
      throw new NonRetriableError("Event ID or Workflow ID is missing");
    }

    await step.run("create-execution", async () => {
      return prisma.execution.create({
        data: {
          workflowId,
          inngestEventId,
          // Store initial data (webhook payload, etc.) immediately so it's available while execution is running
          output: event.data.initialData || {},
        },
      });
    });

    const { sortedNodes, connections } = await step.run(
      "prepare-workflow",
      async () => {
        const workflow = await prisma.workflow.findUniqueOrThrow({
          where: { id: workflowId },
          include: {
            nodes: true,
            connections: true,
          },
        });

        return {
          sortedNodes: topologicalSort(workflow.nodes, workflow.connections),
          connections: workflow.connections,
        };
      },
    );

    const userId = await step.run("find-user-id", async () => {
      const workflow = await prisma.workflow.findUniqueOrThrow({
        where: { id: workflowId },
        select: {
          userId: true,
        },
      });

      return workflow.userId;
    });

    // Initialize context with any initial data from the trigger
    let context = event.data.initialData || {};

    // Determine which trigger node initiated this execution
    const activeTriggerNodeId = getActiveTriggerNodeId(context);

    // Build adjacency maps and initial active node set for branching logic
    type WorkflowConnection = (typeof connections)[number];
    const connectionsByFromNode = new Map<string, WorkflowConnection[]>();
    const incomingConnections = new Map<string, WorkflowConnection[]>();

    for (const connection of connections) {
      if (!connectionsByFromNode.has(connection.fromNodeId)) {
        connectionsByFromNode.set(connection.fromNodeId, []);
      }
      const fromList = connectionsByFromNode.get(connection.fromNodeId);
      if (fromList) {
        fromList.push(connection);
      }

      if (!incomingConnections.has(connection.toNodeId)) {
        incomingConnections.set(connection.toNodeId, []);
      }
      const toList = incomingConnections.get(connection.toNodeId);
      if (toList) {
        toList.push(connection);
      }
    }

    const activeNodeIds = new Set<string>();
    if (activeTriggerNodeId) {
      activeNodeIds.add(activeTriggerNodeId);
    } else {
      for (const node of sortedNodes) {
        const inboundCount = incomingConnections.get(node.id)?.length ?? 0;
        if (inboundCount === 0) {
          activeNodeIds.add(node.id);
        }
      }
    }

    // Execute each node
    try {
      console.log(
        `[Workflow Execution ${workflowId}] Starting execution of ${sortedNodes.length} nodes`,
      );
      console.log(
        `[Workflow Execution ${workflowId}] Active trigger node: ${activeTriggerNodeId || "none (manual or legacy)"}`,
      );

      for (const node of sortedNodes) {
        // Skip trigger nodes that didn't initiate this workflow
        if (
          isTriggerNode(node.type) &&
          activeTriggerNodeId &&
          node.id !== activeTriggerNodeId
        ) {
          console.log(
            `[Workflow Execution ${workflowId}] Skipping inactive trigger node:`,
            {
              nodeId: node.id,
              nodeType: node.type,
              activeTriggerNodeId,
            },
          );
          continue;
        }

        if (!activeNodeIds.has(node.id)) {
          console.log(
            `[Workflow Execution ${workflowId}] Skipping node because branch is inactive:`,
            {
              nodeId: node.id,
              nodeType: node.type,
            },
          );
          continue;
        }

        activeNodeIds.delete(node.id);

        console.log(`[Workflow Execution ${workflowId}] Executing node:`, {
          nodeId: node.id,
          nodeType: node.type,
          nodeData: node.data
            ? JSON.stringify(node.data).substring(0, 500)
            : "no data",
          hasData: !!node.data,
          dataKeys:
            node.data && typeof node.data === "object"
              ? Object.keys(node.data)
              : [],
        });
        const executor = getExecutor(node.type as NodeType);

        // #region agent log
        fetch(
          "http://127.0.0.1:7242/ingest/409f2c88-a960-40ed-8c60-3380a93586bf",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              location: "functions.ts:328",
              message: "Pre-node execution context",
              data: {
                nodeId: node.id,
                nodeType: node.type,
                contextKeysBefore: context ? Object.keys(context) : [],
                contextSnapshotBefore: JSON.stringify(context || {}).slice(
                  0,
                  800,
                ),
              },
              timestamp: Date.now(),
              sessionId: "debug-session",
              hypothesisId: "A,E",
            }),
          },
        ).catch(() => {});
        // #endregion

        try {
          context = await executor({
            data: node.data as Record<string, unknown>,
            nodeId: node.id,
            userId,
            context,
            step,
            publish,
          });

          // #region agent log
          fetch(
            "http://127.0.0.1:7242/ingest/409f2c88-a960-40ed-8c60-3380a93586bf",
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                location: "functions.ts:345",
                message: "Post-node execution context",
                data: {
                  nodeId: node.id,
                  nodeType: node.type,
                  contextKeysAfter: context ? Object.keys(context) : [],
                  contextSnapshotAfter: JSON.stringify(context || {}).slice(
                    0,
                    800,
                  ),
                },
                timestamp: Date.now(),
                sessionId: "debug-session",
                hypothesisId: "A,E",
              }),
            },
          ).catch(() => {});
          // #endregion

          console.log(
            `[Workflow Execution ${workflowId}] Node ${node.id} (${node.type}) completed successfully`,
            {
              contextKeys: context ? Object.keys(context) : [],
            },
          );
        } catch (nodeError) {
          // If a node fails, save the error and re-throw
          const errorMessage =
            nodeError instanceof Error ? nodeError.message : String(nodeError);
          const errorStack =
            nodeError instanceof Error ? nodeError.stack : undefined;

          console.error(
            `[Workflow Execution ${workflowId}] Node ${node.id} (${node.type}) failed:`,
            {
              errorMessage,
              errorStack,
              nodeError,
            },
          );

          await step.run("save-node-error", async () => {
            const updated = await prisma.execution.update({
              where: { inngestEventId, workflowId },
              data: {
                status: ExecutionStatus.FAILED,
                error: errorMessage,
                errorStack: errorStack,
                completedAt: new Date(),
              },
            });
            console.log(
              `[Workflow Execution ${workflowId}] Saved error to execution record:`,
              {
                executionId: updated.id,
                error: updated.error,
              },
            );
            return updated;
          });

          // Re-throw to trigger onFailure handler
          throw nodeError;
        }

        // Activate downstream nodes based on branching outputs
        const outgoingConnections = connectionsByFromNode.get(node.id) ?? [];
        if (outgoingConnections.length > 0) {
          let allowedOutputs: Set<string> | null = null;

          if (node.type === NodeType.FILTER_CONDITIONAL) {
            const meta = (context as Record<string, unknown>).__filterResult as
              | FilterBranchMeta
              | undefined;
            if (
              meta &&
              meta.nodeId === node.id &&
              typeof meta.passed === "boolean"
            ) {
              allowedOutputs = new Set([
                meta.passed ? "source-true" : "source-false",
              ]);
              delete (context as Record<string, unknown>).__filterResult;
            } else if (meta) {
              console.warn(
                `[Workflow Execution ${workflowId}] Filter node result metadata missing or mismatched, activating all branches`,
                {
                  nodeId: node.id,
                  meta,
                },
              );
            }
          }

          for (const connection of outgoingConnections) {
            const fromOutput = connection.fromOutput || "main";
            if (!allowedOutputs || allowedOutputs.has(fromOutput)) {
              activeNodeIds.add(connection.toNodeId);
            }
          }
        }
      }

      await step.run("update-execution", async () => {
        const updated = await prisma.execution.update({
          where: { inngestEventId, workflowId },
          data: {
            status: ExecutionStatus.SUCCESS,
            completedAt: new Date(),
            output: context,
          },
        });
        console.log(
          `[Workflow Execution ${workflowId}] Execution completed successfully`,
        );
        return updated;
      });
    } catch (error) {
      // Ensure error is saved even if onFailure doesn't catch it
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;

      console.error(`[Workflow Execution ${workflowId}] Execution failed:`, {
        errorMessage,
        errorStack,
        error,
      });

      await step.run("save-execution-error", async () => {
        const updated = await prisma.execution.update({
          where: { inngestEventId, workflowId },
          data: {
            status: ExecutionStatus.FAILED,
            error: errorMessage,
            errorStack: errorStack,
            completedAt: new Date(),
          },
        });
        console.log(
          `[Workflow Execution ${workflowId}] Saved error to execution record:`,
          {
            executionId: updated.id,
            error: updated.error,
          },
        );
        return updated;
      });

      // Re-throw to trigger onFailure handler
      throw error;
    }

    return {
      workflowId,
      result: context,
    };
  },
);
