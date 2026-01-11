"use server";

import { getSubscriptionToken, type Realtime } from "@inngest/realtime";
import { trelloChannel } from "@/inngest/channels/trello";
import { inngest } from "@/inngest/client";

export type TrelloToken = Realtime.Token<
  typeof trelloChannel,
  ["status"]
>;

export async function fetchTrelloRealtimeToken(): Promise<TrelloToken> {
  const token = await getSubscriptionToken(inngest, {
    channel: trelloChannel(),
    topics: ["status"],
  });

  return token;
}
