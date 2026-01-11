"use server";

import { getSubscriptionToken, type Realtime } from "@inngest/realtime";
import { googleDriveChannel } from "@/inngest/channels/google-drive";
import { inngest } from "@/inngest/client";

export type GoogleDriveToken = Realtime.Token<
  typeof googleDriveChannel,
  ["status"]
>;

export async function fetchGoogleDriveRealtimeToken(): Promise<GoogleDriveToken> {
  const token = await getSubscriptionToken(inngest, {
    channel: googleDriveChannel(),
    topics: ["status"],
  });

  return token;
}
