"use server";

import { getSubscriptionToken, type Realtime } from "@inngest/realtime";
import { googleCalendarChannel } from "@/inngest/channels/google-calendar";
import { inngest } from "@/inngest/client";

export type GoogleCalendarToken = Realtime.Token<
  typeof googleCalendarChannel,
  ["status"]
>;

export async function fetchGoogleCalendarRealtimeToken(): Promise<GoogleCalendarToken> {
  const token = await getSubscriptionToken(inngest, {
    channel: googleCalendarChannel(),
    topics: ["status"],
  });

  return token;
}
