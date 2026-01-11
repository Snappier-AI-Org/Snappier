"use server";

import { getSubscriptionToken, type Realtime } from "@inngest/realtime";
import { delayWaitChannel } from "@/inngest/channels/delay-wait";
import { inngest } from "@/inngest/client";

export type DelayWaitToken = Realtime.Token<
  typeof delayWaitChannel,
  ["status"]
>;

export async function fetchDelayWaitRealtimeToken(): Promise<DelayWaitToken> {
  const token = await getSubscriptionToken(inngest, {
    channel: delayWaitChannel(),
    topics: ["status"],
  });

  return token;
}
