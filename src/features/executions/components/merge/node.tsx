"use client";

import { type Node, type NodeProps, useReactFlow } from "@xyflow/react";
import { Merge } from "lucide-react";
import { memo, useState } from "react";
import { useNodeStatus } from "../../hooks/use-node-status";
import { MergeDialog, type MergeFormValues } from "./dialog";
import { MERGE_CHANNEL_NAME } from "@/inngest/channels/merge";
import { fetchMergeRealtimeToken } from "./actions";
import { BaseExecutionNode } from "../base-execution-node";

export type MergeNodeData = {
  variableName?: string;
  mode?: "append" | "combine" | "multiplex" | "chooseBranch";
  combineBy?: "position" | "key";
  keyField?: string;
  inputs?: string;
};

export type MergeNodeType = Node<MergeNodeData>;

function buildDescription(data?: MergeNodeData) {
  if (!data?.mode) return "Not configured";
  return `Mode: ${data.mode}`;
}

export const MergeNode = memo((props: NodeProps<MergeNodeType>) => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const { setNodes } = useReactFlow();

  const nodeStatus = useNodeStatus({
    nodeId: props.id,
    channel: MERGE_CHANNEL_NAME,
    topic: "status",
    refreshToken: fetchMergeRealtimeToken,
  });

  const handleOpenSettings = () => setDialogOpen(true);

  const handleSubmit = (values: MergeFormValues) => {
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
      <MergeDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSubmit={handleSubmit}
        defaultValues={props.data}
      />
      <BaseExecutionNode
        {...props}
        id={props.id}
        icon={Merge}
        name="Merge"
        description={buildDescription(props.data)}
        status={nodeStatus}
        onSettings={handleOpenSettings}
        onDoubleClick={handleOpenSettings}
      />
    </>
  );
});

MergeNode.displayName = "MergeNode";

