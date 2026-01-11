"use server";

import { getSubscriptionToken, type Realtime } from "@inngest/realtime";
import { instagramCommentTriggerChannel } from "@/inngest/channels/instagram-comment-trigger";
import { inngest } from "@/inngest/client";

export type InstagramCommentTriggerToken = Realtime.Token<
  typeof instagramCommentTriggerChannel,
  ["status"]
>;

export async function fetchInstagramCommentTriggerRealtimeToken(): Promise<InstagramCommentTriggerToken> {
  const token = await getSubscriptionToken(inngest, {
    channel: instagramCommentTriggerChannel(),
    topics: ["status"],
  });

  return token;
}

