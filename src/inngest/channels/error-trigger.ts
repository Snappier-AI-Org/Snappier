import { channel, topic } from "@inngest/realtime";

export const ERROR_TRIGGER_CHANNEL_NAME = "error-trigger-execution";

export const errorTriggerChannel = channel(ERROR_TRIGGER_CHANNEL_NAME)
  .addTopic(
    topic("status").type<{
      nodeId: string;
      status: "loading" | "success" | "error";
    }>(),
  );

