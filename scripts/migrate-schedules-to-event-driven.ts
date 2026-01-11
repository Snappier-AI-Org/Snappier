/**
 * Migration script to start existing schedules with the new event-driven system.
 * 
 * This script finds all enabled schedules and sends a "schedule/start" event
 * for each one to kick off the new self-scheduling executor.
 * 
 * Run with: npx tsx scripts/migrate-schedules-to-event-driven.ts
 * 
 * Options:
 *   --dry-run    Preview what would be done without actually sending events
 */

import prisma from "../src/lib/db";
import { Inngest } from "inngest";

// Create a simple Inngest client for sending events
const inngest = new Inngest({
  id: "snappier-migration",
  eventKey: process.env.INNGEST_EVENT_KEY,
});

async function main() {
  const isDryRun = process.argv.includes("--dry-run");

  console.log("🔍 Finding enabled schedules to migrate...\n");

  if (isDryRun) {
    console.log("⚠️  DRY RUN MODE - No events will be sent\n");
  }

  // Find all enabled schedules with a future nextRunAt
  const schedules = await prisma.scheduledWorkflow.findMany({
    where: {
      enabled: true,
      nextRunAt: {
        not: null,
      },
    },
    select: {
      id: true,
      workflowId: true,
      nodeId: true,
      scheduleType: true,
      nextRunAt: true,
      intervalValue: true,
      intervalUnit: true,
    },
    orderBy: {
      nextRunAt: "asc",
    },
  });

  if (schedules.length === 0) {
    console.log("✅ No enabled schedules found. Nothing to migrate.");
    return;
  }

  console.log(`📋 Found ${schedules.length} enabled schedule(s) to migrate:\n`);

  for (const schedule of schedules) {
    console.log(`  Schedule ID: ${schedule.id}`);
    console.log(`  Workflow ID: ${schedule.workflowId}`);
    console.log(`  Node ID: ${schedule.nodeId}`);
    console.log(`  Type: ${schedule.scheduleType}`);
    if (schedule.intervalValue && schedule.intervalUnit) {
      console.log(`  Interval: ${schedule.intervalValue} ${schedule.intervalUnit}`);
    }
    console.log(`  Next Run: ${schedule.nextRunAt?.toISOString()}`);

    if (!isDryRun) {
      try {
        await inngest.send({
          name: "schedule/start",
          data: { scheduleId: schedule.id },
        });
        console.log(`  ✅ Event sent successfully`);
      } catch (error) {
        console.log(`  ❌ Failed to send event: ${error}`);
      }
    } else {
      console.log(`  📝 Would send schedule/start event`);
    }
    console.log("");
  }

  if (isDryRun) {
    console.log(`\n📊 Summary: ${schedules.length} schedule(s) would be migrated.`);
    console.log("   Run without --dry-run to actually send events.");
  } else {
    console.log(`\n✅ Migration complete! ${schedules.length} schedule(s) started with new event-driven system.`);
    console.log("\n⚠️  Important next steps:");
    console.log("   1. Monitor the Inngest dashboard for the next 24-48 hours");
    console.log("   2. Verify schedules are executing correctly");
    console.log("   3. Once verified, the old poller can be removed from the codebase");
  }
}

main()
  .catch((error) => {
    console.error("Migration failed:", error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

