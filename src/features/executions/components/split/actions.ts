"use server";

import { getSubscriptionToken, type Realtime } from "@inngest/realtime";
import { splitChannel } from "@/inngest/channels/split";
import { inngest } from "@/inngest/client";

export type SplitToken = Realtime.Token<typeof splitChannel, ["status"]>;

export async function fetchSplitRealtimeToken(): Promise<SplitToken> {
  const token = await getSubscriptionToken(inngest, {
    channel: splitChannel(),
    topics: ["status"],
  });
  return token;
}

