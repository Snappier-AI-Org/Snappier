"use server";

import { getSubscriptionToken, type Realtime } from "@inngest/realtime";
import { inngest } from "@/inngest/client";
import { openrouterChannel } from "@/inngest/channels/openrouter";

export type OpenRouterToken = Realtime.Token<
  typeof openrouterChannel,
  ["status"]
>;

export async function fetchOpenRouterRealtimeToken(): Promise<OpenRouterToken> {
  const token = await getSubscriptionToken(inngest, {
    channel: openrouterChannel(),
    topics: ["status"],
  });

  return token;
}
