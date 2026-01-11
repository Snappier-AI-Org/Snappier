"use client";

import type { Node, NodeProps } from "@xyflow/react";
import { memo, useState } from "react";
import { useReactFlow } from "@xyflow/react";
import { useNodeStatus } from "@/features/executions/hooks/use-node-status";
import { INSTAGRAM_COMMENT_TRIGGER_CHANNEL_NAME } from "@/inngest/channels/instagram-comment-trigger";
import { BaseTriggerNode } from "../base-trigger-node";
import { fetchInstagramCommentTriggerRealtimeToken } from "./actions";
import { InstagramCommentTriggerDialog } from "./dialog";

type InstagramCommentTriggerNodeData = {
  credentialId?: string;
  postId?: string;
  keywords?: string[];
  keywordMatchMode?: "any" | "all" | "exact";
};

type InstagramCommentTriggerNodeType = Node<InstagramCommentTriggerNodeData>;

export const InstagramCommentTriggerNode = memo(
  (props: NodeProps<InstagramCommentTriggerNodeType>) => {
    const [dialogOpen, setDialogOpen] = useState(false);
    const { setNodes } = useReactFlow();

    const nodeData = props.data || {};

    const nodeStatus = useNodeStatus({
      nodeId: props.id,
      channel: INSTAGRAM_COMMENT_TRIGGER_CHANNEL_NAME,
      topic: "status",
      refreshToken: fetchInstagramCommentTriggerRealtimeToken,
    });

    const handleOpenSettings = () => setDialogOpen(true);

    const handleNodeDataChange = (data: InstagramCommentTriggerNodeData) => {
      setNodes((nodes) =>
        nodes.map((node) =>
          node.id === props.id
            ? { ...node, data: { ...node.data, ...data } }
            : node
        )
      );
    };

    let description = "Not configured";
    if (nodeData.credentialId) {
      if (nodeData.postId) {
        description = `Post: ${nodeData.postId.slice(0, 12)}...`;
      } else if (nodeData.keywords?.length) {
        description = `Keywords: ${nodeData.keywords.slice(0, 2).join(", ")}${
          nodeData.keywords.length > 2 ? "..." : ""
        }`;
      } else {
        description = "Watching all comments";
      }
    }

    return (
      <>
        <InstagramCommentTriggerDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          nodeData={nodeData}
          onNodeDataChange={handleNodeDataChange}
        />
        <BaseTriggerNode
          {...props}
          icon="/logos/instagram.svg"
          name="Instagram Comment Trigger"
          description={description}
          status={nodeStatus}
          onSettings={handleOpenSettings}
          onDoubleClick={handleOpenSettings}
        />
      </>
    );
  }
);

InstagramCommentTriggerNode.displayName = "InstagramCommentTriggerNode";

