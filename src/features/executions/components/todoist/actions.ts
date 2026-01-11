"use server";

import { getSubscriptionToken, type Realtime } from "@inngest/realtime";
import { todoistChannel } from "@/inngest/channels/todoist";
import { inngest } from "@/inngest/client";

export type TodoistToken = Realtime.Token<
  typeof todoistChannel,
  ["status"]
>;

export async function fetchTodoistRealtimeToken(): Promise<TodoistToken> {
  const token = await getSubscriptionToken(inngest, {
    channel: todoistChannel(),
    topics: ["status"],
  });

  return token;
}
