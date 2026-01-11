import { inngest } from "./client";
import prisma from "@/lib/db";
import { ScheduleType } from "@/generated/prisma";

/**
 * Calculate the next run time based on schedule configuration
 */
function calculateNextRunAt(schedule: {
  scheduleType: ScheduleType;
  timezone: string;
  cronExpression: string | null;
  intervalValue: number | null;
  intervalUnit: string | null;
  hour: number | null;
  minute: number | null;
  daysOfWeek: number[];
  dayOfMonth: number | null;
}, fromDate: Date = new Date()): Date {
  const now = fromDate;

  switch (schedule.scheduleType) {
    case ScheduleType.INTERVAL: {
      const intervalMs = getIntervalMs(
        schedule.intervalValue || 1,
        (schedule.intervalUnit as "minutes" | "hours" | "days") || "hours"
      );
      return new Date(now.getTime() + intervalMs);
    }

    case ScheduleType.DAILY: {
      const next = new Date(now);
      next.setHours(schedule.hour ?? 9, schedule.minute ?? 0, 0, 0);
      
      if (next <= now) {
        next.setDate(next.getDate() + 1);
      }
      return next;
    }

    case ScheduleType.WEEKLY: {
      const daysOfWeek = schedule.daysOfWeek || [1];
      const targetHour = schedule.hour ?? 9;
      const targetMinute = schedule.minute ?? 0;

      let next = new Date(now);
      next.setHours(targetHour, targetMinute, 0, 0);

      for (let i = 0; i <= 7; i++) {
        const checkDate = new Date(next);
        checkDate.setDate(next.getDate() + i);
        const dayOfWeek = checkDate.getDay();

        if (daysOfWeek.includes(dayOfWeek)) {
          if (i === 0 && checkDate <= now) {
            continue;
          }
          return checkDate;
        }
      }

      next.setDate(next.getDate() + 7);
      return next;
    }

    case ScheduleType.MONTHLY: {
      const targetDay = schedule.dayOfMonth || 1;
      const targetHour = schedule.hour ?? 9;
      const targetMinute = schedule.minute ?? 0;

      let next = new Date(now);
      next.setDate(targetDay);
      next.setHours(targetHour, targetMinute, 0, 0);

      if (next <= now) {
        next.setMonth(next.getMonth() + 1);
      }

      const originalMonth = next.getMonth();
      next.setDate(targetDay);
      if (next.getMonth() !== originalMonth) {
        next = new Date(next.getFullYear(), originalMonth + 1, 0);
        next.setHours(targetHour, targetMinute, 0, 0);
      }

      return next;
    }

    case ScheduleType.CRON: {
      // For cron expressions, we'd need a parser like cron-parser
      // For now, default to checking again in 1 minute
      return new Date(now.getTime() + 60 * 1000);
    }

    default:
      return new Date(now.getTime() + 60 * 60 * 1000);
  }
}

function getIntervalMs(value: number, unit: "minutes" | "hours" | "days"): number {
  switch (unit) {
    case "minutes":
      return value * 60 * 1000;
    case "hours":
      return value * 60 * 60 * 1000;
    case "days":
      return value * 24 * 60 * 60 * 1000;
    default:
      return value * 60 * 60 * 1000;
  }
}

/**
 * Event-driven schedule executor.
 * 
 * This function is triggered by a "schedule/start" event and:
 * 1. Fetches the schedule from the database
 * 2. Sleeps until nextRunAt using step.sleepUntil()
 * 3. Executes the workflow
 * 4. Chains to itself for the next run
 * 
 * It automatically cancels when a "schedule/cancel" event is sent
 * with a matching scheduleId, preventing orphaned executions.
 */
export const executeScheduledWorkflow = inngest.createFunction(
  {
    id: "execute-scheduled-workflow",
    retries: 2,
    cancelOn: [
      {
        event: "schedule/cancel",
        match: "data.scheduleId",
      },
    ],
  },
  { event: "schedule/start" },
  async ({ event, step }) => {
    const { scheduleId } = event.data as { scheduleId: string };

    console.log(`[Schedule Executor] Starting for schedule ${scheduleId}`);

    // 1. Fetch schedule from DB (verify it still exists and is enabled)
    const schedule = await step.run("get-schedule", async () => {
      return prisma.scheduledWorkflow.findUnique({
        where: { id: scheduleId },
      });
    });

    if (!schedule) {
      console.log(`[Schedule Executor] Schedule ${scheduleId} not found, skipping`);
      return { status: "skipped", reason: "schedule_not_found" };
    }

    if (!schedule.enabled) {
      console.log(`[Schedule Executor] Schedule ${scheduleId} is disabled, skipping`);
      return { status: "skipped", reason: "schedule_disabled" };
    }

    // 2. Sleep until nextRunAt if it's in the future
    // Note: nextRunAt may be a string after JSON serialization through step.run
    const nextRunAtDate = schedule.nextRunAt ? new Date(schedule.nextRunAt) : null;
    if (nextRunAtDate && nextRunAtDate > new Date()) {
      console.log(`[Schedule Executor] Sleeping until ${nextRunAtDate.toISOString()} for schedule ${scheduleId}`);
      await step.sleepUntil("wait-for-schedule", nextRunAtDate);
    }

    // 3. Re-verify schedule still exists and is enabled (could be deleted/disabled during sleep)
    const currentSchedule = await step.run("verify-schedule", async () => {
      return prisma.scheduledWorkflow.findUnique({
        where: { id: scheduleId },
      });
    });

    if (!currentSchedule) {
      console.log(`[Schedule Executor] Schedule ${scheduleId} was deleted during sleep, cancelling`);
      return { status: "cancelled", reason: "schedule_deleted_during_sleep" };
    }

    if (!currentSchedule.enabled) {
      console.log(`[Schedule Executor] Schedule ${scheduleId} was disabled during sleep, cancelling`);
      return { status: "cancelled", reason: "schedule_disabled_during_sleep" };
    }

    // 4. Execute the workflow
    const executionResult = await step.run("trigger-workflow", async () => {
      console.log(`[Schedule Executor] Triggering workflow ${currentSchedule.workflowId} for schedule ${scheduleId}`);

      // Get the scheduled time as string
      const scheduledAtStr = currentSchedule.nextRunAt 
        ? new Date(currentSchedule.nextRunAt).toISOString()
        : new Date().toISOString();

      // Trigger the workflow execution
      const eventResult = await inngest.send({
        name: "workflows/execute.workflow",
        data: {
          workflowId: currentSchedule.workflowId,
          initialData: {
            scheduleTrigger: {
              scheduleId: currentSchedule.id,
              nodeId: currentSchedule.nodeId,
              scheduledAt: scheduledAtStr,
              triggeredAt: new Date().toISOString(),
              scheduleType: currentSchedule.scheduleType,
            },
          },
        },
      });

      console.log(`[Schedule Executor] Triggered workflow ${currentSchedule.workflowId}, event ID: ${eventResult.ids[0]}`);

      return {
        workflowId: currentSchedule.workflowId,
        eventId: eventResult.ids[0],
      };
    });

    // 5. Calculate next run time and schedule the next execution
    const scheduleNextResult = await step.run("schedule-next", async () => {
      // Calculate the next run time
      const nextRunAt = calculateNextRunAt(currentSchedule);

      // Check if next run is past the end date
      const endDateObj = currentSchedule.endDate ? new Date(currentSchedule.endDate) : null;
      const shouldDisable = endDateObj && nextRunAt > endDateObj;

      // Update the schedule with next run time and last run time
      await prisma.scheduledWorkflow.update({
        where: { id: scheduleId },
        data: {
          lastRunAt: new Date(),
          nextRunAt: shouldDisable ? null : nextRunAt,
          lastExecutionId: executionResult.eventId,
          enabled: !shouldDisable,
        },
      });

      if (shouldDisable) {
        console.log(`[Schedule Executor] Schedule ${scheduleId} has passed end date, disabling`);
        return { shouldContinue: false, reason: "end_date_passed" };
      }

      // Chain to self for the next run
      await inngest.send({
        name: "schedule/start",
        data: { scheduleId },
      });

      console.log(`[Schedule Executor] Scheduled next run for ${nextRunAt.toISOString()}`);

      return { shouldContinue: true, nextRunAt: nextRunAt.toISOString() };
    });

    return {
      status: "success",
      scheduleId,
      workflowId: executionResult.workflowId,
      eventId: executionResult.eventId,
      next: scheduleNextResult,
    };
  }
);

