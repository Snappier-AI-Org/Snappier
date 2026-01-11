import { channel, topic } from "@inngest/realtime";

export const TRELLO_CHANNEL_NAME = "trello-execution";

export const trelloChannel = channel(TRELLO_CHANNEL_NAME)
  .addTopic(
    topic("status").type<{
      nodeId: string;
      status: "loading" | "success" | "error";
    }>(),
  );
