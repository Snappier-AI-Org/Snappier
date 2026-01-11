"use client";

import { useReactFlow, type Node, type NodeProps } from "@xyflow/react";
import { memo, useState } from "react";
import { BaseExecutionNode } from "../base-execution-node";
import { useNodeStatus } from "../../hooks/use-node-status";
import { fetchGoogleDocsRealtimeToken } from "./actions";
import { GOOGLE_DOCS_CHANNEL_NAME } from "@/inngest/channels/google-docs";
import { GoogleDocsDialog, type GoogleDocsFormValues } from "./dialog";
import { useWorkflowId } from "@/features/editor/context/workflow-context";
import { useLatestExecution } from "@/features/executions/hooks/use-executions";
import { parseError } from "@/features/executions/lib/error-parser";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useWorkflowVariables } from "@/features/editor/hooks/use-workflow-variables";

type GoogleDocsNodeData = {
  credentialId?: string;
  operation?: "get" | "create" | "append" | "replace" | "batchUpdate";
  documentId?: string;
  title?: string;
  content?: string;
  findText?: string;
  replaceText?: string;
  requests?: string;
  variableName?: string;
};

type GoogleDocsNodeType = Node<GoogleDocsNodeData>;

export const GoogleDocsNode = memo((props: NodeProps<GoogleDocsNodeType>) => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const { setNodes } = useReactFlow();
  const workflowVariables = useWorkflowVariables();

  // Get workflowId from context (may not be available in all contexts)
  let workflowId: string | undefined;
  try {
    workflowId = useWorkflowId();
  } catch {
    // Not in workflow context, that's okay
  }

  const { data: latestExecution } = useLatestExecution(workflowId);
  const nodeStatus = useNodeStatus({
    nodeId: props.id,
    channel: GOOGLE_DOCS_CHANNEL_NAME,
    topic: "status",
    refreshToken: fetchGoogleDocsRealtimeToken,
  });

  // Log status changes
  if (nodeStatus === "error") {
    console.log(`[Google Docs Node ${props.id}] Node status is error`, {
      nodeId: props.id,
      latestExecution: latestExecution
        ? {
            id: latestExecution.id,
            status: latestExecution.status,
            error: latestExecution.error,
            errorStack: latestExecution.errorStack,
          }
        : null,
    });
  }

  // Get error message if node is in error state and execution has an error
  const parsedError =
    nodeStatus === "error" && latestExecution?.error
      ? parseError(new Error(latestExecution.error))
      : null;

  const errorMessage = parsedError?.message || null;
  const errorGuidance = parsedError?.guidance || null;
  const errorFixSteps = parsedError?.fixSteps || [];

  if (errorMessage) {
    console.log(`[Google Docs Node ${props.id}] Error message extracted:`, {
      errorMessage,
      errorGuidance,
      errorFixSteps,
      originalError: latestExecution?.error,
    });
  }

  const handleOpenSettings = () => setDialogOpen(true);

  const handleSubmit = (values: GoogleDocsFormValues) => {
    setNodes((nodes) =>
      nodes.map((node) => {
        if (node.id === props.id) {
          return {
            ...node,
            data: {
              ...node.data,
              ...values,
            },
          };
        }
        return node;
      })
    );
  };

  const nodeData = props.data;
  const operation = nodeData?.operation || "get";
  
  const getOperationLabel = (op: string) => {
    switch (op) {
      case "get": return "Get Document";
      case "create": return "Create";
      case "append": return "Append";
      case "replace": return "Find & Replace";
      case "batchUpdate": return "Batch Update";
      default: return op;
    }
  };

  const description = nodeData?.credentialId
    ? `${getOperationLabel(operation)}${nodeData.documentId ? ` (${nodeData.documentId.slice(0, 8)}...)` : nodeData.title ? ` "${nodeData.title}"` : ""}`
    : "Not configured";

  const nodeContent = (
    <BaseExecutionNode
      {...props}
      id={props.id}
      icon="/logos/google-docs.svg"
      name="Google Docs"
      description={description}
      status={nodeStatus}
      onSettings={handleOpenSettings}
      onDoubleClick={handleOpenSettings}
    />
  );

  return (
    <>
      <GoogleDocsDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSubmit={handleSubmit}
        defaultValues={nodeData}
        workflowVariables={workflowVariables}
        currentNodeId={props.id}
      />

      {errorMessage ? (
        <Tooltip>
          <TooltipTrigger asChild>{nodeContent}</TooltipTrigger>
          <TooltipContent className="max-w-md bg-destructive text-destructive-foreground">
            <div className="space-y-3">
              <div>
                <p className="font-semibold mb-1">Error:</p>
                <p className="text-sm font-medium">{errorMessage}</p>
              </div>
              {errorGuidance && (
                <div>
                  <p className="text-xs font-semibold opacity-90 mb-1">
                    What went wrong:
                  </p>
                  <p className="text-xs opacity-90">
                    {errorGuidance}
                  </p>
                </div>
              )}
              {errorFixSteps.length > 0 && (
                <div className="pt-2 border-t border-white/20">
                  <p className="text-xs font-semibold opacity-90 mb-2">
                    How to fix:
                  </p>
                  <ol className="text-xs opacity-90 space-y-1 list-decimal list-inside">
                    {errorFixSteps.slice(0, 3).map((step, index) => (
                      <li key={index}>{step}</li>
                    ))}
                  </ol>
                </div>
              )}
              {latestExecution?.error && (
                <div className="pt-2 border-t border-white/20">
                  <p className="text-xs font-semibold opacity-90 mb-1">
                    Technical Details:
                  </p>
                  <p className="text-xs opacity-90 wrap-break-word font-mono">
                    {latestExecution.error.length > 150
                      ? latestExecution.error.slice(0, 150) + "..."
                      : latestExecution.error}
                  </p>
                </div>
              )}
            </div>
          </TooltipContent>
        </Tooltip>
      ) : (
        nodeContent
      )}
    </>
  );
});

GoogleDocsNode.displayName = "GoogleDocsNode";
