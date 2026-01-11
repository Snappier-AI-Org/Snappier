import type { NodeExecutor } from "@/features/executions/types";
import { discordTriggerChannel } from "@/inngest/channels/discord-trigger";

type DiscordTriggerData = {
  channelId?: string;
  guildId?: string;
  listenToDMs?: boolean;
  keywordFilters?: string[];
  keywordMatchMode?: "any" | "all" | "exact";
  includeBots?: boolean;
};

export const discordTriggerExecutor: NodeExecutor<DiscordTriggerData> = async ({
  nodeId,
  context,
  step,
  publish,
}) => {
  await publish(
    discordTriggerChannel().status({
      nodeId,
      status: "loading",
    }),
  );

  const result = await step.run("discord-trigger", async () => context);

  await publish(
    discordTriggerChannel().status({
      nodeId,
      status: "success",
    }),
  );

  return result;
};
