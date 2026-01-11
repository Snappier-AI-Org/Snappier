"use client";

import { type Node, type NodeProps, useReactFlow } from "@xyflow/react";
import { memo, useState } from "react";
import { useWorkflowVariables } from "@/features/editor/hooks/use-workflow-variables";
import { HUGGINGFACE_CHANNEL_NAME } from "@/inngest/channels/huggingface";
import { useNodeStatus } from "../../hooks/use-node-status";
import { BaseExecutionNode } from "../base-execution-node";
import { fetchHuggingFaceRealtimeToken } from "./actions";
import { HuggingFaceDialog, type HuggingFaceFormValues } from "./dialog";

type HuggingFaceNodeData = {
  variableName?: string;
  credentialId?: string;
  model?: string;
  systemPrompt?: string;
  userPrompt?: string;
};

type HuggingFaceNodeType = Node<HuggingFaceNodeData>;

export const HuggingFaceNode = memo((props: NodeProps<HuggingFaceNodeType>) => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const { setNodes } = useReactFlow();
  const workflowVariables = useWorkflowVariables();

  const nodeStatus = useNodeStatus({
    nodeId: props.id,
    channel: HUGGINGFACE_CHANNEL_NAME,
    topic: "status",
    refreshToken: fetchHuggingFaceRealtimeToken,
  });

  const handleOpenSettings = () => setDialogOpen(true);

  const handleSubmit = (values: HuggingFaceFormValues) => {
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
  const selectedModel = nodeData?.model || "mistralai/Mistral-7B-Instruct-v0.3";
  // Show short model name (last part after /)
  const shortModelName = selectedModel.split("/").pop() || selectedModel;
  const description = nodeData?.userPrompt
    ? `${shortModelName}: ${nodeData.userPrompt.slice(0, 50)}...`
    : "Not configured";

  return (
    <>
      <HuggingFaceDialog
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
        icon="/logos/huggingface.svg"
        name="Hugging Face"
        description={description}
        status={nodeStatus}
        onSettings={handleOpenSettings}
        onDoubleClick={handleOpenSettings}
      />
    </>
  );
});

HuggingFaceNode.displayName = "HuggingFaceNode";
