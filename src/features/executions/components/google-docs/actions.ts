"use server";

import { getSubscriptionToken, type Realtime } from "@inngest/realtime";
import { googleDocsChannel } from "@/inngest/channels/google-docs";
import { inngest } from "@/inngest/client";

export type GoogleDocsToken = Realtime.Token<
  typeof googleDocsChannel,
  ["status"]
>;

export async function fetchGoogleDocsRealtimeToken(): Promise<GoogleDocsToken> {
  const token = await getSubscriptionToken(inngest, {
    channel: googleDocsChannel(),
    topics: ["status"],
  });

  return token;
}
