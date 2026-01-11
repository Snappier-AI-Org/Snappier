"use server";

import { getSubscriptionToken, type Realtime } from "@inngest/realtime";
import { zaloChannel } from "@/inngest/channels/zalo";
import { inngest } from "@/inngest/client";

export type ZaloToken = Realtime.Token<
  typeof zaloChannel,
  ["status"]
>;

export async function fetchZaloRealtimeToken(): Promise<ZaloToken> {
  const token = await getSubscriptionToken(inngest, {
    channel: zaloChannel(),
    topics: ["status"],
  });

  return token;
}


