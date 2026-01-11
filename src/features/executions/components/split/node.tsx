"use client";

import { type Node, type NodeProps, useReactFlow } from "@xyflow/react";
import { Split } from "lucide-react";
import { memo, useState } from "react";
import { useNodeStatus } from "../../hooks/use-node-status";
import { SplitDialog, type SplitFormValues } from "./dialog";
import { SPLIT_CHANNEL_NAME } from "@/inngest/channels/split";
import { fetchSplitRealtimeToken } from "./actions";
import { BaseExecutionNode } from "../base-execution-node";

export type SplitNodeData = {
  variableName?: string;
  mode?: "splitInBatches" | "splitByField" | "splitByDelimiter";
  batchSize?: number;
  field?: string;
  delimiter?: string;
  inputVariable?: string;
};

export type SplitNodeType = Node<SplitNodeData>;

function buildDescription(data?: SplitNodeData) {
  if (!data?.mode) return "Not configured";
  if (data.mode === "splitInBatches") return `Batches of ${data.batchSize || 10}`;
  if (data.mode === "splitByField") return `By field: ${data.field || "?"}`;
  if (data.mode === "splitByDelimiter") return `By: "${data.delimiter || ","}"`;
  return data.mode;
}

export const SplitNode = memo((props: NodeProps<SplitNodeType>) => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const { setNodes } = useReactFlow();

  const nodeStatus = useNodeStatus({
    nodeId: props.id,
    channel: SPLIT_CHANNEL_NAME,
    topic: "status",
    refreshToken: fetchSplitRealtimeToken,
  });

  const handleOpenSettings = () => setDialogOpen(true);

  const handleSubmit = (values: SplitFormValues) => {
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
      <SplitDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSubmit={handleSubmit}
        defaultValues={props.data}
      />
      <BaseExecutionNode
        {...props}
        id={props.id}
        icon={Split}
        name="Split"
        description={buildDescription(props.data)}
        status={nodeStatus}
        onSettings={handleOpenSettings}
        onDoubleClick={handleOpenSettings}
      />
    </>
  );
});

SplitNode.displayName = "SplitNode";

