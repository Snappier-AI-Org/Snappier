"use server";

import { getSubscriptionToken, type Realtime } from "@inngest/realtime";
import { githubChannel } from "@/inngest/channels/github";
import { inngest } from "@/inngest/client";

export type GithubToken = Realtime.Token<
  typeof githubChannel,
  ["status"]
>;

export async function fetchGithubRealtimeToken(): Promise<GithubToken> {
  const token = await getSubscriptionToken(inngest, {
    channel: githubChannel(),
    topics: ["status"],
  });

  return token;
}
