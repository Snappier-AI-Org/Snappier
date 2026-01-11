"use client";

import { type Node, type NodeProps, useReactFlow } from "@xyflow/react";
import { GitBranch } from "lucide-react";
import { memo, useState } from "react";
import { useNodeStatus } from "../../hooks/use-node-status";
import { SwitchDialog, type SwitchFormValues } from "./dialog";
import { SWITCH_CHANNEL_NAME } from "@/inngest/channels/switch";
import { fetchSwitchRealtimeToken } from "./actions";
import { BaseExecutionNode } from "../base-execution-node";

export type SwitchNodeData = {
  variableName?: string;
  rules?: Array<{ name: string; condition: string; output: number }>;
  fallbackOutput?: number;
};

export type SwitchNodeType = Node<SwitchNodeData>;

function buildDescription(data?: SwitchNodeData) {
  if (!data?.rules || data.rules.length === 0) return "Not configured";
  return `${data.rules.length} rule${data.rules.length !== 1 ? "s" : ""}`;
}

export const SwitchNode = memo((props: NodeProps<SwitchNodeType>) => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const { setNodes } = useReactFlow();

  const nodeStatus = useNodeStatus({
    nodeId: props.id,
    channel: SWITCH_CHANNEL_NAME,
    topic: "status",
    refreshToken: fetchSwitchRealtimeToken,
  });

  const handleOpenSettings = () => setDialogOpen(true);

  const handleSubmit = (values: SwitchFormValues) => {
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
      <SwitchDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSubmit={handleSubmit}
        defaultValues={props.data}
      />
      <BaseExecutionNode
        {...props}
        id={props.id}
        icon={GitBranch}
        name="Switch"
        description={buildDescription(props.data)}
        status={nodeStatus}
        onSettings={handleOpenSettings}
        onDoubleClick={handleOpenSettings}
      />
    </>
  );
});

SwitchNode.displayName = "SwitchNode";

