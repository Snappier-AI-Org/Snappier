"use client";

import { type Node, type NodeProps, useReactFlow } from "@xyflow/react";
import { Clock3 } from "lucide-react";
import { memo, useState } from "react";
import { useNodeStatus } from "../../hooks/use-node-status";
import { DelayWaitDialog, type DelayWaitFormValues } from "./dialog";
import { DELAY_WAIT_CHANNEL_NAME } from "@/inngest/channels/delay-wait";
import { fetchDelayWaitRealtimeToken } from "./actions";
import { BaseExecutionNode } from "../base-execution-node";

export type DelayWaitNodeData = {
  amount?: number;
  unit?: "seconds" | "minutes" | "hours" | "days";
  variableName?: string;
};

export type DelayWaitNodeType = Node<DelayWaitNodeData>;

function buildDescription(data?: DelayWaitNodeData) {
  if (!data?.amount || !data.unit) return "Not configured";
  const amount = data.amount;
  const unitLabel = data.unit.replace(/s$/, "");
  return `Wait ${amount} ${unitLabel}${amount === 1 ? "" : "s"}`;
}

export const DelayWaitNode = memo((props: NodeProps<DelayWaitNodeType>) => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const { setNodes } = useReactFlow();

  const nodeStatus = useNodeStatus({
    nodeId: props.id,
    channel: DELAY_WAIT_CHANNEL_NAME,
    topic: "status",
    refreshToken: fetchDelayWaitRealtimeToken,
  });

  const handleOpenSettings = () => setDialogOpen(true);

  const handleSubmit = (values: DelayWaitFormValues) => {
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

  const description = buildDescription(props.data);

  return (
    <>
      <DelayWaitDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSubmit={handleSubmit}
        defaultValues={props.data}
      />

      <BaseExecutionNode
        {...props}
        id={props.id}
        icon={Clock3}
        name="Delay / Wait"
        description={description}
        status={nodeStatus}
        onSettings={handleOpenSettings}
        onDoubleClick={handleOpenSettings}
      />
    </>
  );
});

DelayWaitNode.displayName = "DelayWaitNode";
