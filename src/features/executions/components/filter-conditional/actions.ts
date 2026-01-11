"use server";

import { getSubscriptionToken, type Realtime } from "@inngest/realtime";
import { filterConditionalChannel } from "@/inngest/channels/filter-conditional";
import { inngest } from "@/inngest/client";

export type FilterConditionalToken = Realtime.Token<
  typeof filterConditionalChannel,
  ["status"]
>;

export async function fetchFilterConditionalRealtimeToken(): Promise<FilterConditionalToken> {
  const token = await getSubscriptionToken(inngest, {
    channel: filterConditionalChannel(),
    topics: ["status"],
  });

  return token;
}
