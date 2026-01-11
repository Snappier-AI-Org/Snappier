import { channel, topic } from "@inngest/realtime";

export const INSTAGRAM_DM_CHANNEL_NAME = "instagram-dm-execution";

export const instagramDmChannel = channel(INSTAGRAM_DM_CHANNEL_NAME)
  .addTopic(
    topic("status").type<{
      nodeId: string;
      status: "loading" | "success" | "error";
    }>(),
  );

