"use server";

import { getSubscriptionToken, type Realtime } from "@inngest/realtime";
import { instagramCommentReplyChannel } from "@/inngest/channels/instagram-comment-reply";
import { inngest } from "@/inngest/client";

export type InstagramCommentReplyToken = Realtime.Token<
  typeof instagramCommentReplyChannel,
  ["status"]
>;

export async function fetchInstagramCommentReplyRealtimeToken(): Promise<InstagramCommentReplyToken> {
  const token = await getSubscriptionToken(inngest, {
    channel: instagramCommentReplyChannel(),
    topics: ["status"],
  });

  return token;
}

