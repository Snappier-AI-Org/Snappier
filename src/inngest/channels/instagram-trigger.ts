import { channel, topic } from "@inngest/realtime";

export const INSTAGRAM_TRIGGER_CHANNEL_NAME = "instagram-trigger-execution";

export const instagramTriggerChannel = channel(INSTAGRAM_TRIGGER_CHANNEL_NAME)
  .addTopic(
    topic("status").type<{
      nodeId: string;
      status: "loading" | "success" | "error";
    }>(),
  );
