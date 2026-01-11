"use server";

import { getSubscriptionToken, type Realtime } from "@inngest/realtime";
import { loopChannel } from "@/inngest/channels/loop";
import { inngest } from "@/inngest/client";

export type LoopToken = Realtime.Token<
  typeof loopChannel,
  ["status"]
>;

export async function fetchLoopRealtimeToken(): Promise<LoopToken> {
  const token = await getSubscriptionToken(inngest, {
    channel: loopChannel(),
    topics: ["status"],
  });

  return token;
}
