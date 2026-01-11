"use client";

import type { Node, NodeProps } from "@xyflow/react";
import { memo, useState } from "react";
import { useReactFlow } from "@xyflow/react";
import { useNodeStatus } from "@/features/executions/hooks/use-node-status";
import { INSTAGRAM_DM_TRIGGER_CHANNEL_NAME } from "@/inngest/channels/instagram-dm-trigger";
import { BaseTriggerNode } from "../base-trigger-node";
import { fetchInstagramDmTriggerRealtimeToken } from "./actions";
import { InstagramDmTriggerDialog } from "./dialog";

type InstagramDmTriggerNodeData = {
  credentialId?: string;
  keywords?: string[];
  keywordMatchMode?: "any" | "all" | "exact";
};

type InstagramDmTriggerNodeType = Node<InstagramDmTriggerNodeData>;

export const InstagramDmTriggerNode = memo((props: NodeProps<InstagramDmTriggerNodeType>) => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const { setNodes } = useReactFlow();

  const nodeData = props.data || {};

  const nodeStatus = useNodeStatus({
    nodeId: props.id,
    channel: INSTAGRAM_DM_TRIGGER_CHANNEL_NAME,
    topic: "status",
    refreshToken: fetchInstagramDmTriggerRealtimeToken,
  });

  const handleOpenSettings = () => setDialogOpen(true);

  const handleNodeDataChange = (data: InstagramDmTriggerNodeData) => {
    setNodes((nodes) =>
      nodes.map((node) =>
        node.id === props.id
          ? { ...node, data: { ...node.data, ...data } }
          : node
      )
    );
  };

  const description = nodeData.credentialId
    ? nodeData.keywords?.length
      ? `Keywords: ${nodeData.keywords.slice(0, 2).join(", ")}${nodeData.keywords.length > 2 ? "..." : ""}`
      : "Watching for all DMs"
    : "Not configured";

  return (
    <>
      <InstagramDmTriggerDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        nodeData={nodeData}
        onNodeDataChange={handleNodeDataChange}
      />
      <BaseTriggerNode
        {...props}
        icon="/logos/instagram.svg"
        name="Instagram DM Trigger"
        description={description}
        status={nodeStatus}
        onSettings={handleOpenSettings}
        onDoubleClick={handleOpenSettings}
      />
    </>
  );
});

InstagramDmTriggerNode.displayName = "InstagramDmTriggerNode";

