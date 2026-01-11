import { channel, topic } from "@inngest/realtime";

export const TODOIST_CHANNEL_NAME = "todoist-execution";

export const todoistChannel = channel(TODOIST_CHANNEL_NAME)
  .addTopic(
    topic("status").type<{
      nodeId: string;
      status: "loading" | "success" | "error";
    }>(),
  );
