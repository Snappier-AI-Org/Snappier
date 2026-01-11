import type { NodeExecutor } from "@/features/executions/types";
import { scheduleTriggerChannel } from "@/inngest/channels/schedule-trigger";

type ScheduleTriggerData = {
  scheduleType?: string;
  timezone?: string;
  cronExpression?: string;
  intervalValue?: number;
  intervalUnit?: string;
  hour?: number;
  minute?: number;
  daysOfWeek?: number[];
  dayOfMonth?: number;
};

export const scheduleTriggerExecutor: NodeExecutor<ScheduleTriggerData> = async ({
  nodeId,
  context,
  step,
  publish,
}) => {
  await publish(
    scheduleTriggerChannel().status({
      nodeId,
      status: "loading",
    }),
  );

  const result = await step.run("schedule-trigger", async () => {
    // The schedule trigger passes through the context with schedule metadata
    return {
      ...context,
      scheduleTrigger: {
        triggeredAt: new Date().toISOString(),
        nodeId,
      },
    };
  });

  await publish(
    scheduleTriggerChannel().status({
      nodeId,
      status: "success",
    }),
  );

  return result;
};
