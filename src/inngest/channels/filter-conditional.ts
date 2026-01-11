import { channel, topic } from "@inngest/realtime";

export const FILTER_CONDITIONAL_CHANNEL_NAME = "filter-conditional-execution";

export const filterConditionalChannel = channel(FILTER_CONDITIONAL_CHANNEL_NAME)
  .addTopic(
    topic("status").type<{
      nodeId: string;
      status: "loading" | "success" | "error";
    }>(),
  );
