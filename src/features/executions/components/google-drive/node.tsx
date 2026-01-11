"use client";

import { useReactFlow, type Node, type NodeProps } from "@xyflow/react";
import { memo, useState } from "react";
import { BaseExecutionNode } from "../base-execution-node";
import { useNodeStatus } from "../../hooks/use-node-status";
import { fetchGoogleDriveRealtimeToken } from "./actions";
import { GOOGLE_DRIVE_CHANNEL_NAME } from "@/inngest/channels/google-drive";
import { GoogleDriveDialog, type GoogleDriveFormValues } from "./dialog";
import { useWorkflowId } from "@/features/editor/context/workflow-context";
import { useLatestExecution } from "@/features/executions/hooks/use-executions";
import { parseError } from "@/features/executions/lib/error-parser";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useWorkflowVariables } from "@/features/editor/hooks/use-workflow-variables";

type GoogleDriveNodeData = {
  credentialId?: string;
  operation?: "list" | "upload" | "download" | "create_folder" | "delete" | "move" | "copy" | "share";
  folderId?: string;
  fileId?: string;
  fileName?: string;
  fileContent?: string;
  mimeType?: string;
  destinationFolderId?: string;
  shareEmail?: string;
  shareRole?: "reader" | "commenter" | "writer";
  query?: string;
  variableName?: string;
};

type GoogleDriveNodeType = Node<GoogleDriveNodeData>;

export const GoogleDriveNode = memo((props: NodeProps<GoogleDriveNodeType>) => {
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
    channel: GOOGLE_DRIVE_CHANNEL_NAME,
    topic: "status",
    refreshToken: fetchGoogleDriveRealtimeToken,
  });

  // Log status changes
  if (nodeStatus === "error") {
    console.log(`[Google Drive Node ${props.id}] Node status is error`, {
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
    console.log(`[Google Drive Node ${props.id}] Error message extracted:`, {
      errorMessage,
      errorGuidance,
      errorFixSteps,
      originalError: latestExecution?.error,
    });
  }

  const handleOpenSettings = () => setDialogOpen(true);

  const handleSubmit = (values: GoogleDriveFormValues) => {
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
  const operation = nodeData?.operation || "list";
  
  const getOperationLabel = (op: string) => {
    switch (op) {
      case "list": return "List Files";
      case "upload": return "Upload";
      case "download": return "Download";
      case "create_folder": return "Create Folder";
      case "delete": return "Delete";
      case "move": return "Move";
      case "copy": return "Copy";
      case "share": return "Share";
      default: return op;
    }
  };

  const description = nodeData?.credentialId
    ? `${getOperationLabel(operation)}${nodeData.folderId ? ` in ${nodeData.folderId.slice(0, 10)}...` : ""}`
    : "Not configured";

  const nodeContent = (
    <BaseExecutionNode
      {...props}
      id={props.id}
      icon="/logos/google-drive.svg"
      name="Google Drive"
      description={description}
      status={nodeStatus}
      onSettings={handleOpenSettings}
      onDoubleClick={handleOpenSettings}
    />
  );

  return (
    <>
      <GoogleDriveDialog
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

GoogleDriveNode.displayName = "GoogleDriveNode";
