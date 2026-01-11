"use server";

import { getSubscriptionToken, type Realtime } from "@inngest/realtime";
import { discordTriggerChannel } from "@/inngest/channels/discord-trigger";
import { inngest } from "@/inngest/client";

export type DiscordTriggerToken = Realtime.Token<
  typeof discordTriggerChannel,
  ["status"]
>;

export async function fetchDiscordTriggerRealtimeToken(): Promise<DiscordTriggerToken> {
  const token = await getSubscriptionToken(inngest, {
    channel: discordTriggerChannel(),
    topics: ["status"],
  });

  return token;
}
