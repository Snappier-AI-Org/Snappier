"use server";

import { getSubscriptionToken, type Realtime } from "@inngest/realtime";
import { instagramDmTriggerChannel } from "@/inngest/channels/instagram-dm-trigger";
import { inngest } from "@/inngest/client";

export type InstagramDmTriggerToken = Realtime.Token<
  typeof instagramDmTriggerChannel,
  ["status"]
>;

export async function fetchInstagramDmTriggerRealtimeToken(): Promise<InstagramDmTriggerToken> {
  const token = await getSubscriptionToken(inngest, {
    channel: instagramDmTriggerChannel(),
    topics: ["status"],
  });

  return token;
}

