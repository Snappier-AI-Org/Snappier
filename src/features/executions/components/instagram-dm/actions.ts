"use server";

import { getSubscriptionToken, type Realtime } from "@inngest/realtime";
import { instagramDmChannel } from "@/inngest/channels/instagram-dm";
import { inngest } from "@/inngest/client";

export type InstagramDmToken = Realtime.Token<
  typeof instagramDmChannel,
  ["status"]
>;

export async function fetchInstagramDmRealtimeToken(): Promise<InstagramDmToken> {
  const token = await getSubscriptionToken(inngest, {
    channel: instagramDmChannel(),
    topics: ["status"],
  });

  return token;
}

