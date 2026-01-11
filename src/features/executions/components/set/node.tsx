"use client";

import { type Node, type NodeProps, useReactFlow } from "@xyflow/react";
import { Variable } from "lucide-react";
import { memo, useState } from "react";
import { useNodeStatus } from "../../hooks/use-node-status";
import { SetDialog, type SetFormValues } from "./dialog";
import { SET_CHANNEL_NAME } from "@/inngest/channels/set";
import { fetchSetRealtimeToken } from "./actions";
import { BaseExecutionNode } from "../base-execution-node";

export type SetNodeData = {
  fields?: Array<{ name: string; value: string; type: "string" | "number" | "boolean" | "json" | "expression" }>;
  keepOnlySet?: boolean;
};

export type SetNodeType = Node<SetNodeData>;

function buildDescription(data?: SetNodeData) {
  if (!data?.fields || data.fields.length === 0) return "Not configured";
  return `${data.fields.length} field${data.fields.length !== 1 ? "s" : ""}`;
}

export const SetNode = memo((props: NodeProps<SetNodeType>) => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const { setNodes } = useReactFlow();

  const nodeStatus = useNodeStatus({
    nodeId: props.id,
    channel: SET_CHANNEL_NAME,
    topic: "status",
    refreshToken: fetchSetRealtimeToken,
  });

  const handleOpenSettings = () => setDialogOpen(true);

  const handleSubmit = (values: SetFormValues) => {
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
      <SetDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSubmit={handleSubmit}
        defaultValues={props.data}
      />
      <BaseExecutionNode
        {...props}
        id={props.id}
        icon={Variable}
        name="Set"
        description={buildDescription(props.data)}
        status={nodeStatus}
        onSettings={handleOpenSettings}
        onDoubleClick={handleOpenSettings}
      />
    </>
  );
});

SetNode.displayName = "SetNode";

