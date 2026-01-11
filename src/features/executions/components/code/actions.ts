"use server";

import { getSubscriptionToken, type Realtime } from "@inngest/realtime";
import { codeChannel } from "@/inngest/channels/code";
import { inngest } from "@/inngest/client";

export type CodeToken = Realtime.Token<typeof codeChannel, ["status"]>;

export async function fetchCodeRealtimeToken(): Promise<CodeToken> {
  const token = await getSubscriptionToken(inngest, {
    channel: codeChannel(),
    topics: ["status"],
  });
  return token;
}

