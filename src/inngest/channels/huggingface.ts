import { channel, topic } from "@inngest/realtime";

export const HUGGINGFACE_CHANNEL_NAME = "huggingface-execution";

export const huggingfaceChannel = channel(HUGGINGFACE_CHANNEL_NAME)
.addTopic(
  topic("status").type<{
    nodeId: string;
    status: "loading" | "success" | "error";
  }>(),
);
