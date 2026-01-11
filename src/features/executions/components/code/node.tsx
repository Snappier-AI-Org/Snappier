"use client";

import { type Node, type NodeProps, useReactFlow } from "@xyflow/react";
import { Code2 } from "lucide-react";
import { memo, useState } from "react";
import { useNodeStatus } from "../../hooks/use-node-status";
import { CodeDialog, type CodeFormValues } from "./dialog";
import { CODE_CHANNEL_NAME } from "@/inngest/channels/code";
import { fetchCodeRealtimeToken } from "./actions";
import { BaseExecutionNode } from "../base-execution-node";

export type CodeNodeData = {
  variableName?: string;
  code?: string;
};

export type CodeNodeType = Node<CodeNodeData>;

function buildDescription(data?: CodeNodeData) {
  if (!data?.code) return "Not configured";
  const lines = data.code.split("\n").length;
  return `${lines} line${lines !== 1 ? "s" : ""} of code`;
}

export const CodeNode = memo((props: NodeProps<CodeNodeType>) => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const { setNodes } = useReactFlow();

  const nodeStatus = useNodeStatus({
    nodeId: props.id,
    channel: CODE_CHANNEL_NAME,
    topic: "status",
    refreshToken: fetchCodeRealtimeToken,
  });

  const handleOpenSettings = () => setDialogOpen(true);

  const handleSubmit = (values: CodeFormValues) => {
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
      <CodeDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSubmit={handleSubmit}
        defaultValues={props.data}
      />
      <BaseExecutionNode
        {...props}
        id={props.id}
        icon={Code2}
        name="Code"
        description={buildDescription(props.data)}
        status={nodeStatus}
        onSettings={handleOpenSettings}
        onDoubleClick={handleOpenSettings}
      />
    </>
  );
});

CodeNode.displayName = "CodeNode";

