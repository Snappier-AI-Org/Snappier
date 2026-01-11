"use server";

import { getSubscriptionToken, type Realtime } from "@inngest/realtime";
import { errorTriggerChannel } from "@/inngest/channels/error-trigger";
import { inngest } from "@/inngest/client";

export type ErrorTriggerToken = Realtime.Token<typeof errorTriggerChannel, ["status"]>;

export async function fetchErrorTriggerRealtimeToken(): Promise<ErrorTriggerToken> {
  const token = await getSubscriptionToken(inngest, {
    channel: errorTriggerChannel(),
    topics: ["status"],
  });
  return token;
}

