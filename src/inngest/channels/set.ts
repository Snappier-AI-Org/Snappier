import { channel, topic } from "@inngest/realtime";

export const SET_CHANNEL_NAME = "set-execution";

export const setChannel = channel(SET_CHANNEL_NAME)
  .addTopic(
    topic("status").type<{
      nodeId: string;
      status: "loading" | "success" | "error";
    }>(),
  );

