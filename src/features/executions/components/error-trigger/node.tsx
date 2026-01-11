"use client";

import { type Node, type NodeProps, useReactFlow } from "@xyflow/react";
import { AlertTriangle } from "lucide-react";
import { memo, useState } from "react";
import { useNodeStatus } from "../../hooks/use-node-status";
import { ErrorTriggerDialog, type ErrorTriggerFormValues } from "./dialog";
import { ERROR_TRIGGER_CHANNEL_NAME } from "@/inngest/channels/error-trigger";
import { fetchErrorTriggerRealtimeToken } from "./actions";
import { BaseExecutionNode } from "../base-execution-node";

export type ErrorTriggerNodeData = {
  variableName?: string;
  continueOnError?: boolean;
};

export type ErrorTriggerNodeType = Node<ErrorTriggerNodeData>;

function buildDescription(data?: ErrorTriggerNodeData) {
  if (data?.continueOnError) return "Continue on error";
  return "Stop on error";
}

export const ErrorTriggerNode = memo((props: NodeProps<ErrorTriggerNodeType>) => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const { setNodes } = useReactFlow();

  const nodeStatus = useNodeStatus({
    nodeId: props.id,
    channel: ERROR_TRIGGER_CHANNEL_NAME,
    topic: "status",
    refreshToken: fetchErrorTriggerRealtimeToken,
  });

  const handleOpenSettings = () => setDialogOpen(true);

  const handleSubmit = (values: ErrorTriggerFormValues) => {
    setNodes((nodes) =>
      nodes.map((node) => {
        if (node.id === props.id) {
          return { ...node, data: { ...node.data, ...values } };
        }
        return node;
      }),
    );
  };

  return (
    <>
      <ErrorTriggerDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSubmit={handleSubmit}
        defaultValues={props.data}
      />
      <BaseExecutionNode
        {...props}
        id={props.id}
        icon={AlertTriangle}
        name="Error Trigger"
        description={buildDescription(props.data)}
        status={nodeStatus}
        onSettings={handleOpenSettings}
        onDoubleClick={handleOpenSettings}
      />
    </>
  );
});

ErrorTriggerNode.displayName = "ErrorTriggerNode";

