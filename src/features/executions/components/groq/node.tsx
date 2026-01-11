"use client";

import { type Node, type NodeProps, useReactFlow } from "@xyflow/react";
import { memo, useState } from "react";
import { useWorkflowVariables } from "@/features/editor/hooks/use-workflow-variables";
import { GROQ_CHANNEL_NAME } from "@/inngest/channels/groq";
import { useNodeStatus } from "../../hooks/use-node-status";
import { BaseExecutionNode } from "../base-execution-node";
import { fetchGroqRealtimeToken } from "./actions";
import { GroqDialog, type GroqFormValues } from "./dialog";

type GroqNodeData = {
  variableName?: string;
  credentialId?: string;
  model?: string;
  systemPrompt?: string;
  userPrompt?: string;
};

type GroqNodeType = Node<GroqNodeData>;

export const GroqNode = memo((props: NodeProps<GroqNodeType>) => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const { setNodes } = useReactFlow();
  const workflowVariables = useWorkflowVariables();

  const nodeStatus = useNodeStatus({
    nodeId: props.id,
    channel: GROQ_CHANNEL_NAME,
    topic: "status",
    refreshToken: fetchGroqRealtimeToken,
  });

  const handleOpenSettings = () => setDialogOpen(true);

  const handleSubmit = (values: GroqFormValues) => {
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
  const selectedModel = nodeData?.model || "llama-3.3-70b-versatile";
  const description = nodeData?.userPrompt
    ? `${selectedModel}: ${nodeData.userPrompt.slice(0, 50)}...`
    : "Not configured";

  return (
    <>
      <GroqDialog
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
        icon="/logos/groq.svg"
        name="Groq"
        description={description}
        status={nodeStatus}
        onSettings={handleOpenSettings}
        onDoubleClick={handleOpenSettings}
      />
    </>
  );
});

GroqNode.displayName = "GroqNode";
