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
 * This Inngest function runs every minute to check for scheduled workflows
 * that are due to run and triggers their execution.
 */
export const processScheduledWorkflows = inngest.createFunction(
  {
    id: "process-scheduled-workflows",
    retries: 2,
  },
  { cron: "* * * * *" }, // Run every minute
  async ({ step }) => {
    const now = new Date();

    console.log(`[Schedule Poller] Checking for due schedules at ${now.toISOString()}`);

    // Find all enabled schedules that are due (nextRunAt <= now)
    const dueSchedules = await step.run("find-due-schedules", async () => {
      return prisma.scheduledWorkflow.findMany({
        where: {
          enabled: true,
          nextRunAt: {
            lte: now,
          },
        },
      });
    });

    console.log(`[Schedule Poller] Found ${dueSchedules.length} due schedule(s)`);

    if (dueSchedules.length === 0) {
      return { processed: 0 };
    }

    // Process each due schedule sequentially (Inngest steps don't work well with parallel execution)
    let successful = 0;
    let failed = 0;

    for (const schedule of dueSchedules) {
      try {
        await step.run(`trigger-workflow-${schedule.id}`, async () => {
          console.log(`[Schedule Poller] Triggering workflow ${schedule.workflowId} for schedule ${schedule.id}`);

          // Calculate the next run time
          const nextRunAt = calculateNextRunAt(schedule);

          // Check if next run is past the end date
          const endDateObj = schedule.endDate ? new Date(schedule.endDate) : null;
          const shouldDisable = endDateObj && nextRunAt > endDateObj;

          // Update the schedule with next run time and last run time
          await prisma.scheduledWorkflow.update({
            where: { id: schedule.id },
            data: {
              lastRunAt: new Date(),
              nextRunAt: shouldDisable ? null : nextRunAt,
              enabled: !shouldDisable,
            },
          });

          // Get the scheduled time as string
          const scheduledAtStr = schedule.nextRunAt 
            ? new Date(schedule.nextRunAt).toISOString()
            : new Date().toISOString();

          // Trigger the workflow execution
          const event = await inngest.send({
            name: "workflows/execute.workflow",
            data: {
              workflowId: schedule.workflowId,
              initialData: {
                scheduleTrigger: {
                  scheduleId: schedule.id,
                  nodeId: schedule.nodeId,
                  scheduledAt: scheduledAtStr,
                  triggeredAt: new Date().toISOString(),
                  scheduleType: schedule.scheduleType,
                },
              },
            },
          });

          console.log(`[Schedule Poller] Triggered workflow ${schedule.workflowId}, event ID: ${event.ids[0]}`);

          // Update lastExecutionId
          await prisma.scheduledWorkflow.update({
            where: { id: schedule.id },
            data: {
              lastExecutionId: event.ids[0],
            },
          });

          return {
            scheduleId: schedule.id,
            workflowId: schedule.workflowId,
            eventId: event.ids[0],
          };
        });
        successful++;
      } catch (error) {
        console.error(`[Schedule Poller] Failed to trigger workflow for schedule ${schedule.id}:`, error);
        failed++;
      }
    }

    console.log(`[Schedule Poller] Processed ${successful} successfully, ${failed} failed`);

    return {
      processed: dueSchedules.length,
      successful,
      failed,
    };
  }
);
