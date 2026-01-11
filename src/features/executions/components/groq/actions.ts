"use server";

import { getSubscriptionToken, type Realtime } from "@inngest/realtime";
import { inngest } from "@/inngest/client";
import { groqChannel } from "@/inngest/channels/groq";

export type GroqToken = Realtime.Token<
  typeof groqChannel,
  ["status"]
>;

export async function fetchGroqRealtimeToken(): Promise<GroqToken> {
  const token = await getSubscriptionToken(inngest, {
    channel: groqChannel(),
    topics: ["status"],
  });

  return token;
}
