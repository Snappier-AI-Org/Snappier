import { channel, topic } from "@inngest/realtime";

export const INSTAGRAM_DM_TRIGGER_CHANNEL_NAME = "instagram-dm-trigger-execution";

export const instagramDmTriggerChannel = channel(INSTAGRAM_DM_TRIGGER_CHANNEL_NAME)
  .addTopic(
    topic("status").type<{
      nodeId: string;
      status: "loading" | "success" | "error";
    }>(),
  );

