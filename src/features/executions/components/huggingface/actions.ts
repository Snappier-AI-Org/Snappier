"use server";

import { getSubscriptionToken, type Realtime } from "@inngest/realtime";
import { inngest } from "@/inngest/client";
import { huggingfaceChannel } from "@/inngest/channels/huggingface";

export type HuggingFaceToken = Realtime.Token<
  typeof huggingfaceChannel,
  ["status"]
>;

export async function fetchHuggingFaceRealtimeToken(): Promise<HuggingFaceToken> {
  const token = await getSubscriptionToken(inngest, {
    channel: huggingfaceChannel(),
    topics: ["status"],
  });

  return token;
}
