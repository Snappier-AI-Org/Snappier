import { channel, topic } from "@inngest/realtime";

export const DISCORD_TRIGGER_CHANNEL_NAME = "discord-trigger-execution";

export const discordTriggerChannel = channel(
  DISCORD_TRIGGER_CHANNEL_NAME,
).addTopic(
  topic("status").type<{
    nodeId: string;
    status: "loading" | "success" | "error";
  }>(),
);
