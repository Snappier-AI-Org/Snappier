import { channel, topic } from "@inngest/realtime";

export const ZALO_CHANNEL_NAME = "zalo-execution";

export const zaloChannel = channel(ZALO_CHANNEL_NAME)
  .addTopic(
    topic("status").type<{
      nodeId: string;
      status: "loading" | "success" | "error";
    }>(),
  );


