import type { NodeProps } from "@xyflow/react";
import { Link2Icon } from "lucide-react";
import { memo, useState } from "react";
import { useNodeStatus } from "@/features/executions/hooks/use-node-status";
import { WEBHOOK_TRIGGER_CHANNEL_NAME } from "@/inngest/channels/webhook-trigger";
import { BaseTriggerNode } from "../base-trigger-node";
import { fetchWebhookTriggerRealtimeToken } from "./actions";
import { WebhookTriggerDialog } from "./dialog";

export const WebhookTriggerNode = memo((props: NodeProps) => {
  const [dialogOpen, setDialogOpen] = useState(false);

  const nodeStatus = useNodeStatus({
    nodeId: props.id,
    channel: WEBHOOK_TRIGGER_CHANNEL_NAME,
    topic: "status",
    refreshToken: fetchWebhookTriggerRealtimeToken,
  });

  const handleOpenSettings = () => setDialogOpen(true);

  return (
    <>
      <WebhookTriggerDialog open={dialogOpen} onOpenChange={setDialogOpen} nodeId={props.id} />
      <BaseTriggerNode
        {...props}
        icon={Link2Icon}
        name="Webhook Trigger"
        description="Runs when an HTTP webhook is received"
        status={nodeStatus}
        onSettings={handleOpenSettings}
        onDoubleClick={handleOpenSettings}
      />
    </>
  );
});

WebhookTriggerNode.displayName = "WebhookTriggerNode";
