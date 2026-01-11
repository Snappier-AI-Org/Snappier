"use server";

import { getSubscriptionToken, type Realtime } from "@inngest/realtime";
import { outlookChannel } from "@/inngest/channels/outlook";
import { inngest } from "@/inngest/client";

export type OutlookToken = Realtime.Token<
  typeof outlookChannel,
  ["status"]
>;

export async function fetchOutlookRealtimeToken(): Promise<OutlookToken> {
  const token = await getSubscriptionToken(inngest, {
    channel: outlookChannel(),
    topics: ["status"],
  });

  return token;
}
