import type { NodeProps } from "@xyflow/react";
import { ClockIcon } from "lucide-react";
import { memo, useState } from "react";
import { useNodeStatus } from "@/features/executions/hooks/use-node-status";
import { SCHEDULE_TRIGGER_CHANNEL_NAME } from "@/inngest/channels/schedule-trigger";
import { BaseTriggerNode } from "../base-trigger-node";
import { fetchScheduleTriggerRealtimeToken } from "./actions";
import { ScheduleTriggerDialog } from "./dialog";

export const ScheduleTriggerNode = memo((props: NodeProps) => {
  const [dialogOpen, setDialogOpen] = useState(false);

  const nodeStatus = useNodeStatus({
    nodeId: props.id,
    channel: SCHEDULE_TRIGGER_CHANNEL_NAME,
    topic: "status",
    refreshToken: fetchScheduleTriggerRealtimeToken,
  });
  
  const handleOpenSettings = () => setDialogOpen(true);

  // Extract nodeData from props
  const nodeData = props.data as {
    scheduleType?: string;
    timezone?: string;
    cronExpression?: string;
    intervalValue?: number;
    intervalUnit?: "minutes" | "hours" | "days";
    hour?: number;
    minute?: number;
    daysOfWeek?: number[];
    dayOfMonth?: number;
  } | undefined;

  return (
    <>
      <ScheduleTriggerDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        currentNodeId={props.id}
        nodeData={nodeData as any}
        onNodeDataChange={(data) => {
          // This will be handled by the parent editor
          // The dialog saves directly to the database
        }}
      />
      <BaseTriggerNode
        {...props}
        icon={ClockIcon}
        name="Schedule Trigger"
        description="Runs on a schedule"
        status={nodeStatus}
        onSettings={handleOpenSettings}
        onDoubleClick={handleOpenSettings}
      />
    </>
  );
});

ScheduleTriggerNode.displayName = "ScheduleTriggerNode";
