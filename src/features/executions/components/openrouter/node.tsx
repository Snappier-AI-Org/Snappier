"use client";

import { type Node, type NodeProps, useReactFlow } from "@xyflow/react";
import { memo, useState } from "react";
import { useWorkflowVariables } from "@/features/editor/hooks/use-workflow-variables";
import { OPENROUTER_CHANNEL_NAME } from "@/inngest/channels/openrouter";
import { useNodeStatus } from "../../hooks/use-node-status";
import { BaseExecutionNode } from "../base-execution-node";
import { fetchOpenRouterRealtimeToken } from "./actions";
import { OpenRouterDialog, type OpenRouterFormValues } from "./dialog";

type OpenRouterNodeData = {
  variableName?: string;
  credentialId?: string;
  model?: string;
  systemPrompt?: string;
  userPrompt?: string;
};

type OpenRouterNodeType = Node<OpenRouterNodeData>;

export const OpenRouterNode = memo((props: NodeProps<OpenRouterNodeType>) => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const { setNodes } = useReactFlow();
  const workflowVariables = useWorkflowVariables();

  const nodeStatus = useNodeStatus({
    nodeId: props.id,
    channel: OPENROUTER_CHANNEL_NAME,
    topic: "status",
    refreshToken: fetchOpenRouterRealtimeToken,
  });

  const handleOpenSettings = () => setDialogOpen(true);

  const handleSubmit = (values: OpenRouterFormValues) => {
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
      }),
    );
  };

  const nodeData = props.data;
  const selectedModel = nodeData?.model || "openai/gpt-4o-mini";
  const description = nodeData?.userPrompt
    ? `${selectedModel}: ${nodeData.userPrompt.slice(0, 50)}...`
    : "Not configured";

  return (
    <>
      <OpenRouterDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSubmit={handleSubmit}
        defaultValues={nodeData}
        workflowVariables={workflowVariables}
        currentNodeId={props.id}
      />

      <BaseExecutionNode
        {...props}
        id={props.id}
        icon="/logos/openrouter.png"
        name="OpenRouter"
        description={description}
        status={nodeStatus}
        onSettings={handleOpenSettings}
        onDoubleClick={handleOpenSettings}
      />
    </>
  );
});

OpenRouterNode.displayName = "OpenRouterNode";
