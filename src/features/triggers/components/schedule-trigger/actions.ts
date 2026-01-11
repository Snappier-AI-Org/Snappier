"use server";

import { auth } from "@/lib/auth";
import prisma from "@/lib/db";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { getSubscriptionToken, type Realtime } from "@inngest/realtime";
import { scheduleTriggerChannel } from "@/inngest/channels/schedule-trigger";
import { inngest } from "@/inngest/client";
import { ScheduleType } from "@/generated/prisma";

export type ScheduleTriggerToken = Realtime.Token<
  typeof scheduleTriggerChannel,
  ["status"]
>;

export type ScheduleConfig = {
  scheduleType: ScheduleType;
  timezone: string;
  cronExpression?: string;
  intervalValue?: number;
  intervalUnit?: "minutes" | "hours" | "days";
  hour?: number;
  minute?: number;
  daysOfWeek?: number[];
  dayOfMonth?: number;
  startDate?: string;
  endDate?: string;
};

/**
 * Calculate the next run time based on schedule configuration
 */
function calculateNextRunAt(config: ScheduleConfig, fromDate: Date = new Date()): Date {
  const now = fromDate;

  switch (config.scheduleType) {
    case ScheduleType.INTERVAL: {
      const intervalMs = getIntervalMs(config.intervalValue || 1, config.intervalUnit || "hours");
      return new Date(now.getTime() + intervalMs);
    }

    case ScheduleType.DAILY: {
      const next = new Date(now);
      next.setHours(config.hour ?? 9, config.minute ?? 0, 0, 0);
      
      // If the time has already passed today, schedule for tomorrow
      if (next <= now) {
        next.setDate(next.getDate() + 1);
      }
      return next;
    }

    case ScheduleType.WEEKLY: {
      const daysOfWeek = config.daysOfWeek || [1]; // Default to Monday
      const targetHour = config.hour ?? 9;
      const targetMinute = config.minute ?? 0;

      let next = new Date(now);
      next.setHours(targetHour, targetMinute, 0, 0);

      // Find the next matching day
      for (let i = 0; i <= 7; i++) {
        const checkDate = new Date(next);
        checkDate.setDate(next.getDate() + i);
        const dayOfWeek = checkDate.getDay();

        if (daysOfWeek.includes(dayOfWeek)) {
          if (i === 0 && checkDate <= now) {
            // Today but time passed, continue to next occurrence
            continue;
          }
          return checkDate;
        }
      }

      // Fallback: 7 days from now
      next.setDate(next.getDate() + 7);
      return next;
    }

    case ScheduleType.MONTHLY: {
      const targetDay = config.dayOfMonth || 1;
      const targetHour = config.hour ?? 9;
      const targetMinute = config.minute ?? 0;

      let next = new Date(now);
      next.setDate(targetDay);
      next.setHours(targetHour, targetMinute, 0, 0);

      // If the date has passed this month, move to next month
      if (next <= now) {
        next.setMonth(next.getMonth() + 1);
      }

      // Handle months with fewer days
      const originalMonth = next.getMonth();
      next.setDate(targetDay);
      if (next.getMonth() !== originalMonth) {
        // Day doesn't exist in this month, use last day
        next = new Date(next.getFullYear(), originalMonth + 1, 0);
        next.setHours(targetHour, targetMinute, 0, 0);
      }

      return next;
    }

    case ScheduleType.CRON: {
      // For cron, we'll compute next run using a simple approach
      // In production, you might want to use a library like cron-parser
      // For now, default to 1 hour from now (the Inngest cron poller will handle actual cron)
      return new Date(now.getTime() + 60 * 60 * 1000);
    }

    default:
      // Default to 1 hour from now
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
      return value * 60 * 60 * 1000; // Default to hours
  }
}

/**
 * Create or update a schedule for a workflow trigger node
 */
export async function saveSchedule(
  workflowId: string,
  nodeId: string,
  config: ScheduleConfig
): Promise<{ success: boolean; error?: string; scheduleId?: string }> {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user?.id) {
      return { success: false, error: "Unauthorized" };
    }

    const userId = session.user.id;

    // Verify the workflow belongs to this user
    const workflow = await prisma.workflow.findFirst({
      where: { id: workflowId, userId },
    });

    if (!workflow) {
      return { success: false, error: "Workflow not found" };
    }

    // Calculate next run time
    const nextRunAt = calculateNextRunAt(config);

    // Check if startDate is in the future
    if (config.startDate) {
      const startDate = new Date(config.startDate);
      if (startDate > nextRunAt) {
        // Recalculate from start date
        const nextFromStart = calculateNextRunAt(config, startDate);
        if (nextFromStart > nextRunAt) {
          // Use the later date
        }
      }
    }

    // Check if endDate has passed
    if (config.endDate) {
      const endDate = new Date(config.endDate);
      if (endDate < new Date()) {
        return { success: false, error: "End date has already passed" };
      }
    }

    // Check if schedule already exists (to determine if we need to cancel existing)
    const existingSchedule = await prisma.scheduledWorkflow.findUnique({
      where: {
        workflowId_nodeId: {
          workflowId,
          nodeId,
        },
      },
    });

    // If schedule exists, cancel any running Inngest function first
    if (existingSchedule) {
      await inngest.send({
        name: "schedule/cancel",
        data: { scheduleId: existingSchedule.id },
      });
    }

    // Upsert the scheduled workflow
    const scheduledWorkflow = await prisma.scheduledWorkflow.upsert({
      where: {
        workflowId_nodeId: {
          workflowId,
          nodeId,
        },
      },
      create: {
        userId,
        workflowId,
        nodeId,
        scheduleType: config.scheduleType,
        timezone: config.timezone,
        enabled: true,
        cronExpression: config.cronExpression,
        intervalValue: config.intervalValue,
        intervalUnit: config.intervalUnit,
        hour: config.hour,
        minute: config.minute,
        daysOfWeek: config.daysOfWeek || [],
        dayOfMonth: config.dayOfMonth,
        nextRunAt,
        startDate: config.startDate ? new Date(config.startDate) : null,
        endDate: config.endDate ? new Date(config.endDate) : null,
      },
      update: {
        scheduleType: config.scheduleType,
        timezone: config.timezone,
        enabled: true, // Re-enable when saving
        cronExpression: config.cronExpression,
        intervalValue: config.intervalValue,
        intervalUnit: config.intervalUnit,
        hour: config.hour,
        minute: config.minute,
        daysOfWeek: config.daysOfWeek || [],
        dayOfMonth: config.dayOfMonth,
        nextRunAt,
        startDate: config.startDate ? new Date(config.startDate) : null,
        endDate: config.endDate ? new Date(config.endDate) : null,
      },
    });

    // Start the event-driven schedule executor
    await inngest.send({
      name: "schedule/start",
      data: { scheduleId: scheduledWorkflow.id },
    });

    revalidatePath(`/workflows/${workflowId}`);

    return { success: true, scheduleId: scheduledWorkflow.id };
  } catch (error) {
    console.error("Error saving schedule:", error);
    return { success: false, error: "Failed to save schedule" };
  }
}

/**
 * Enable or disable a schedule
 */
export async function toggleSchedule(
  workflowId: string,
  nodeId: string,
  enabled: boolean
): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user?.id) {
      return { success: false, error: "Unauthorized" };
    }

    const userId = session.user.id;

    // Verify ownership
    const schedule = await prisma.scheduledWorkflow.findFirst({
      where: { workflowId, nodeId, userId },
    });

    if (!schedule) {
      return { success: false, error: "Schedule not found" };
    }

    await prisma.scheduledWorkflow.update({
      where: { id: schedule.id },
      data: { enabled },
    });

    // Send appropriate Inngest event based on enabled state
    if (enabled) {
      // Start the schedule executor
      await inngest.send({
        name: "schedule/start",
        data: { scheduleId: schedule.id },
      });
    } else {
      // Cancel any running schedule executor
      await inngest.send({
        name: "schedule/cancel",
        data: { scheduleId: schedule.id },
      });
    }

    revalidatePath(`/workflows/${workflowId}`);

    return { success: true };
  } catch (error) {
    console.error("Error toggling schedule:", error);
    return { success: false, error: "Failed to toggle schedule" };
  }
}

/**
 * Delete a schedule
 */
export async function deleteSchedule(
  workflowId: string,
  nodeId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user?.id) {
      return { success: false, error: "Unauthorized" };
    }

    const userId = session.user.id;

    // Verify ownership
    const schedule = await prisma.scheduledWorkflow.findFirst({
      where: { workflowId, nodeId, userId },
    });

    if (!schedule) {
      return { success: false, error: "Schedule not found" };
    }

    // Cancel any running schedule executor BEFORE deleting
    await inngest.send({
      name: "schedule/cancel",
      data: { scheduleId: schedule.id },
    });

    await prisma.scheduledWorkflow.delete({
      where: { id: schedule.id },
    });

    revalidatePath(`/workflows/${workflowId}`);

    return { success: true };
  } catch (error) {
    console.error("Error deleting schedule:", error);
    return { success: false, error: "Failed to delete schedule" };
  }
}

/**
 * Get the current schedule status for a workflow node
 */
export async function getScheduleStatus(
  workflowId: string,
  nodeId: string
): Promise<{
  exists: boolean;
  enabled: boolean;
  nextRunAt?: Date;
  lastRunAt?: Date;
  scheduleType?: ScheduleType;
  config?: ScheduleConfig;
}> {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user?.id) {
      return { exists: false, enabled: false };
    }

    const userId = session.user.id;

    const schedule = await prisma.scheduledWorkflow.findFirst({
      where: { workflowId, nodeId, userId },
    });

    if (!schedule) {
      return { exists: false, enabled: false };
    }

    return {
      exists: true,
      enabled: schedule.enabled,
      nextRunAt: schedule.nextRunAt || undefined,
      lastRunAt: schedule.lastRunAt || undefined,
      scheduleType: schedule.scheduleType,
      config: {
        scheduleType: schedule.scheduleType,
        timezone: schedule.timezone,
        cronExpression: schedule.cronExpression || undefined,
        intervalValue: schedule.intervalValue ?? undefined,
        intervalUnit: schedule.intervalUnit as "minutes" | "hours" | "days" | undefined,
        hour: schedule.hour ?? undefined,
        minute: schedule.minute ?? undefined,
        daysOfWeek: schedule.daysOfWeek,
        dayOfMonth: schedule.dayOfMonth ?? undefined,
        startDate: schedule.startDate?.toISOString(),
        endDate: schedule.endDate?.toISOString(),
      },
    };
  } catch (error) {
    console.error("Error getting schedule status:", error);
    return { exists: false, enabled: false };
  }
}

/**
 * Fetch realtime token for schedule trigger status updates
 */
export async function fetchScheduleTriggerRealtimeToken(): Promise<ScheduleTriggerToken> {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  const token = await getSubscriptionToken(inngest, {
    channel: scheduleTriggerChannel(),
    topics: ["status"],
  });

  return token;
}

/**
 * Clean up orphaned schedules - schedules where the node no longer exists in the workflow
 */
export async function cleanupOrphanedSchedules(
  workflowId?: string
): Promise<{ success: boolean; deletedCount: number; error?: string }> {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user?.id) {
      return { success: false, deletedCount: 0, error: "Unauthorized" };
    }

    const userId = session.user.id;

    // Find all schedules for this user (optionally filtered by workflow)
    const schedules = await prisma.scheduledWorkflow.findMany({
      where: {
        userId,
        ...(workflowId ? { workflowId } : {}),
      },
      select: {
        id: true,
        workflowId: true,
        nodeId: true,
      },
    });

    if (schedules.length === 0) {
      return { success: true, deletedCount: 0 };
    }

    // Get all unique workflow IDs
    const workflowIds = [...new Set(schedules.map(s => s.workflowId))];

    // Get all nodes for these workflows
    const nodes = await prisma.node.findMany({
      where: {
        workflowId: { in: workflowIds },
      },
      select: {
        id: true,
        workflowId: true,
      },
    });

    // Create a set of valid node IDs per workflow
    const validNodeIds = new Set(nodes.map(n => `${n.workflowId}:${n.id}`));

    // Find orphaned schedules (where the node doesn't exist anymore)
    const orphanedScheduleIds = schedules
      .filter(s => !validNodeIds.has(`${s.workflowId}:${s.nodeId}`))
      .map(s => s.id);

    if (orphanedScheduleIds.length === 0) {
      return { success: true, deletedCount: 0 };
    }

    // Delete orphaned schedules
    await prisma.scheduledWorkflow.deleteMany({
      where: {
        id: { in: orphanedScheduleIds },
      },
    });

    console.log(`[Schedule Cleanup] Deleted ${orphanedScheduleIds.length} orphaned schedule(s)`);

    return { success: true, deletedCount: orphanedScheduleIds.length };
  } catch (error) {
    console.error("Error cleaning up orphaned schedules:", error);
    return { success: false, deletedCount: 0, error: "Failed to cleanup orphaned schedules" };
  }
}

/**
 * Disable all schedules for a specific workflow
 */
export async function disableAllSchedulesForWorkflow(
  workflowId: string
): Promise<{ success: boolean; disabledCount: number; error?: string }> {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user?.id) {
      return { success: false, disabledCount: 0, error: "Unauthorized" };
    }

    const userId = session.user.id;

    const result = await prisma.scheduledWorkflow.updateMany({
      where: {
        workflowId,
        userId,
        enabled: true,
      },
      data: {
        enabled: false,
      },
    });

    console.log(`[Schedule Disable] Disabled ${result.count} schedule(s) for workflow ${workflowId}`);

    return { success: true, disabledCount: result.count };
  } catch (error) {
    console.error("Error disabling schedules:", error);
    return { success: false, disabledCount: 0, error: "Failed to disable schedules" };
  }
}
