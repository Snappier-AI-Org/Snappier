"use server";

import { getSubscriptionToken, type Realtime } from "@inngest/realtime";
import { instagramTriggerChannel } from "@/inngest/channels/instagram-trigger";
import { inngest } from "@/inngest/client";

export type InstagramTriggerToken = Realtime.Token<
  typeof instagramTriggerChannel,
  ["status"]
>;

export async function fetchInstagramTriggerRealtimeToken(): Promise<InstagramTriggerToken> {
  const token = await getSubscriptionToken(inngest, {
    channel: instagramTriggerChannel(),
    topics: ["status"],
  });

  return token;
}
