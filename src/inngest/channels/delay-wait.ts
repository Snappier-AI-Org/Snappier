import { channel, topic } from "@inngest/realtime";

export const DELAY_WAIT_CHANNEL_NAME = "delay-wait-execution";

export const delayWaitChannel = channel(DELAY_WAIT_CHANNEL_NAME).addTopic(
  topic("status").type<{
    nodeId: string;
    status: "loading" | "success" | "error";
  }>(),
);
