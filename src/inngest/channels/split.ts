import { channel, topic } from "@inngest/realtime";

export const SPLIT_CHANNEL_NAME = "split-execution";

export const splitChannel = channel(SPLIT_CHANNEL_NAME)
  .addTopic(
    topic("status").type<{
      nodeId: string;
      status: "loading" | "success" | "error";
    }>(),
  );

