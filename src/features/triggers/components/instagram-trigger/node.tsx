"use client";

import type { Node, NodeProps } from "@xyflow/react";
import { memo, useState, useCallback } from "react";
import { useReactFlow } from "@xyflow/react";
import { useSetAtom } from "jotai";
import { useNodeStatus } from "@/features/executions/hooks/use-node-status";
import { INSTAGRAM_TRIGGER_CHANNEL_NAME } from "@/inngest/channels/instagram-trigger";
import { triggerSaveAtom } from "@/features/editor/store/atoms";
import { BaseTriggerNode } from "../base-trigger-node";
import { fetchInstagramTriggerRealtimeToken } from "./actions";
import { InstagramTriggerDialog } from "./dialog";

export type InstagramTriggerType = "dm" | "comment" | "both";

export type InstagramTriggerNodeData = {
  credentialId?: string;
  triggerType?: InstagramTriggerType;
  // DM-specific options
  dmKeywords?: string[];
  dmKeywordMatchMode?: "any" | "all" | "exact";
  // Comment-specific options
  postId?: string;
  commentKeywords?: string[];
  commentKeywordMatchMode?: "any" | "all" | "exact";
};

type InstagramTriggerNodeType = Node<InstagramTriggerNodeData>;

export const InstagramTriggerNode = memo((props: NodeProps<InstagramTriggerNodeType>) => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const { setNodes } = useReactFlow();
  const triggerSave = useSetAtom(triggerSaveAtom);

  const nodeData = props.data || {};

  const nodeStatus = useNodeStatus({
    nodeId: props.id,
    channel: INSTAGRAM_TRIGGER_CHANNEL_NAME,
    topic: "status",
    refreshToken: fetchInstagramTriggerRealtimeToken,
  });

  const handleOpenSettings = () => setDialogOpen(true);

  const handleNodeDataChange = useCallback((data: InstagramTriggerNodeData) => {
    setNodes((nodes) =>
      nodes.map((node) =>
        node.id === props.id
          ? { ...node, data: { ...node.data, ...data } }
          : node
      )
    );
    // Trigger save after node data update
    triggerSave((prev) => prev + 1);
  }, [props.id, setNodes, triggerSave]);

  // Generate description based on configuration
  const getDescription = () => {
    if (!nodeData.credentialId) {
      return "Not configured";
    }

    const triggerType = nodeData.triggerType || "both";
    const parts: string[] = [];

    if (triggerType === "dm" || triggerType === "both") {
      if (nodeData.dmKeywords?.length) {
        parts.push(`DM: ${nodeData.dmKeywords.slice(0, 2).join(", ")}${nodeData.dmKeywords.length > 2 ? "..." : ""}`);
      } else {
        parts.push("DM: All");
      }
    }

    if (triggerType === "comment" || triggerType === "both") {
      if (nodeData.postId) {
        parts.push(`Comment: Post ${nodeData.postId.slice(0, 8)}...`);
      } else if (nodeData.commentKeywords?.length) {
        parts.push(`Comment: ${nodeData.commentKeywords.slice(0, 2).join(", ")}${nodeData.commentKeywords.length > 2 ? "..." : ""}`);
      } else {
        parts.push("Comment: All");
      }
    }

    return parts.join(" | ") || "Watching all events";
  };

  return (
    <>
      <InstagramTriggerDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        nodeData={nodeData}
        onNodeDataChange={handleNodeDataChange}
      />
      <BaseTriggerNode
        {...props}
        icon="/logos/instagram.svg"
        name="Instagram Trigger"
        description={getDescription()}
        status={nodeStatus}
        onSettings={handleOpenSettings}
        onDoubleClick={handleOpenSettings}
      />
    </>
  );
});

InstagramTriggerNode.displayName = "InstagramTriggerNode";
