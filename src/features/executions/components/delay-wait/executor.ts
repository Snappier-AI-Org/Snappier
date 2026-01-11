import { NonRetriableError } from "inngest";
import type { NodeExecutor } from "@/features/executions/types";
import { delayWaitChannel } from "@/inngest/channels/delay-wait";

export type DelayWaitData = {
  amount?: number;
  unit?: "seconds" | "minutes" | "hours" | "days";
  variableName?: string;
};

const UNIT_TO_MS: Record<NonNullable<DelayWaitData["unit"]>, number> = {
  seconds: 1000,
  minutes: 60_000,
  hours: 3_600_000,
  days: 86_400_000,
};

const MAX_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export const delayWaitExecutor: NodeExecutor<DelayWaitData> = async ({
  data,
  nodeId,
  context,
  step,
  publish,
}) => {
  const amount = Number(data.amount ?? 0);
  const unit = data.unit ?? "seconds";
  const variableName = data.variableName?.trim() || "delay";

  const multiplier = UNIT_TO_MS[unit];
  const durationMs = multiplier ? amount * multiplier : 0;

  await publish(
    delayWaitChannel().status({
      nodeId,
      status: "loading",
    }),
  );

  try {
    if (!Number.isFinite(durationMs) || durationMs <= 0) {
      throw new NonRetriableError("Delay duration must be greater than 0");
    }

    if (durationMs > MAX_DURATION_MS) {
      throw new NonRetriableError("Delay duration cannot exceed 7 days");
    }

    const startedAt = new Date().toISOString();

    await step.sleep(`delay-wait-${nodeId}`, durationMs);

    const completedAt = new Date().toISOString();

    await publish(
      delayWaitChannel().status({
        nodeId,
        status: "success",
      }),
    );

    return {
      ...context,
      [variableName]: {
        amount,
        unit,
        durationMs,
        startedAt,
        completedAt,
      },
    };
  } catch (error) {
    await publish(
      delayWaitChannel().status({
        nodeId,
        status: "error",
      }),
    );
    throw error;
  }
};
