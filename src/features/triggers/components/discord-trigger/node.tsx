"use client";

import type { Node, NodeProps } from "@xyflow/react";
import { useReactFlow } from "@xyflow/react";
import { memo, useState } from "react";
import { useNodeStatus } from "@/features/executions/hooks/use-node-status";
import { DISCORD_TRIGGER_CHANNEL_NAME } from "@/inngest/channels/discord-trigger";
import { BaseTriggerNode } from "../base-trigger-node";
import { fetchDiscordTriggerRealtimeToken } from "./actions";
import { DiscordTriggerDialog } from "./dialog";

type DiscordTriggerNodeData = {
  channelId?: string;
  guildId?: string;
  listenToDMs?: boolean;
  keywordFilters?: string[];
  keywordMatchMode?: "any" | "all" | "exact";
  includeBots?: boolean;
};

type DiscordTriggerNodeType = Node<DiscordTriggerNodeData>;

export const DiscordTriggerNode = memo(
  (props: NodeProps<DiscordTriggerNodeType>) => {
    const [dialogOpen, setDialogOpen] = useState(false);
    const { setNodes } = useReactFlow();

    const nodeData = props.data || {};

    const nodeStatus = useNodeStatus({
      nodeId: props.id,
      channel: DISCORD_TRIGGER_CHANNEL_NAME,
      topic: "status",
      refreshToken: fetchDiscordTriggerRealtimeToken,
    });

    const handleOpenSettings = () => setDialogOpen(true);

    const handleNodeDataChange = (data: DiscordTriggerNodeData) => {
      setNodes((nodes) =>
        nodes.map((node) =>
          node.id === props.id
            ? { ...node, data: { ...node.data, ...data } }
            : node,
        ),
      );
    };

    const description = (() => {
      if (nodeData.channelId) {
        return nodeData.guildId
          ? `Listening to #${nodeData.channelId} in guild ${nodeData.guildId}`
          : `Listening to channel ${nodeData.channelId}`;
      }
      if (nodeData.listenToDMs) return "Listening to DMs";
      return "Not configured";
    })();

    return (
      <>
        <DiscordTriggerDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          nodeData={nodeData}
          onNodeDataChange={handleNodeDataChange}
        />
        <BaseTriggerNode
          {...props}
          icon="/logos/discord.svg"
          name="Discord Trigger"
          description={description}
          status={nodeStatus}
          onSettings={handleOpenSettings}
          onDoubleClick={handleOpenSettings}
        />
      </>
    );
  },
);

DiscordTriggerNode.displayName = "DiscordTriggerNode";
