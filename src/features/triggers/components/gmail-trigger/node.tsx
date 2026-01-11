"use client";

import type { Node, NodeProps } from "@xyflow/react";
import { memo, useState } from "react";
import { useReactFlow } from "@xyflow/react";
import { useNodeStatus } from "@/features/executions/hooks/use-node-status";
import { GMAIL_TRIGGER_CHANNEL_NAME } from "@/inngest/channels/gmail-trigger";
import { BaseTriggerNode } from "../base-trigger-node";
import { fetchGmailTriggerRealtimeToken } from "./actions";
import { GmailTriggerDialog } from "./dialog";

type GmailTriggerNodeData = {
  credentialId?: string;
  labelIds?: string[];
};

type GmailTriggerNodeType = Node<GmailTriggerNodeData>;

export const GmailTriggerNode = memo((props: NodeProps<GmailTriggerNodeType>) => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const { setNodes } = useReactFlow();

  const nodeData = props.data || {};

  const nodeStatus = useNodeStatus({
    nodeId: props.id,
    channel: GMAIL_TRIGGER_CHANNEL_NAME,
    topic: "status",
    refreshToken: fetchGmailTriggerRealtimeToken,
  });

  const handleOpenSettings = () => setDialogOpen(true);

  const handleNodeDataChange = (data: GmailTriggerNodeData) => {
    setNodes((nodes) =>
      nodes.map((node) =>
        node.id === props.id
          ? { ...node, data: { ...node.data, ...data } }
          : node
      )
    );
  };

  const description = nodeData.credentialId
    ? "Watching for new emails"
    : "Not configured";

  return (
    <>
      <GmailTriggerDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        nodeData={nodeData}
        onNodeDataChange={handleNodeDataChange}
      />
      <BaseTriggerNode
        {...props}
        icon="/logos/gmail.svg"
        name="Gmail Trigger"
        description={description}
        status={nodeStatus}
        onSettings={handleOpenSettings}
        onDoubleClick={handleOpenSettings}
      />
    </>
  );
});

GmailTriggerNode.displayName = "GmailTriggerNode";
