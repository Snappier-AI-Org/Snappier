/**
 * Script to check and clean up orphaned/active scheduled workflows
 * Run with: npx tsx scripts/cleanup-schedules.ts
 */

import prisma from "../src/lib/db";

async function main() {
  console.log("🔍 Checking for active scheduled workflows...\n");

  // Find all enabled schedules
  const activeSchedules = await prisma.scheduledWorkflow.findMany({
    where: { enabled: true },
    select: {
      id: true,
      workflowId: true,
      nodeId: true,
      enabled: true,
      intervalValue: true,
      intervalUnit: true,
      nextRunAt: true,
      scheduleType: true,
    },
  });

  if (activeSchedules.length === 0) {
    console.log("✅ No active scheduled workflows found.");
    return;
  }

  console.log(`⚠️  Found ${activeSchedules.length} active schedule(s):\n`);

  for (const schedule of activeSchedules) {
    console.log(`  ID: ${schedule.id}`);
    console.log(`  Workflow ID: ${schedule.workflowId}`);
    console.log(`  Node ID: ${schedule.nodeId}`);
    console.log(`  Type: ${schedule.scheduleType}`);
    console.log(`  Interval: ${schedule.intervalValue} ${schedule.intervalUnit}`);
    console.log(`  Next Run: ${schedule.nextRunAt?.toISOString()}`);
    
    // Check if the node still exists
    const nodeExists = await prisma.node.findUnique({
      where: { id: schedule.nodeId },
    });
    
    if (!nodeExists) {
      console.log(`  ⚠️  STATUS: ORPHANED (node no longer exists)`);
    } else {
      console.log(`  ✅ STATUS: Valid (node exists)`);
    }
    console.log("");
  }

  // Ask about cleanup
  const orphanedSchedules = [];
  for (const schedule of activeSchedules) {
    const nodeExists = await prisma.node.findUnique({
      where: { id: schedule.nodeId },
    });
    if (!nodeExists) {
      orphanedSchedules.push(schedule);
    }
  }

  if (orphanedSchedules.length > 0) {
    console.log(`\n🧹 Found ${orphanedSchedules.length} orphaned schedule(s). Cleaning up...`);
    
    await prisma.scheduledWorkflow.deleteMany({
      where: {
        id: { in: orphanedSchedules.map(s => s.id) },
      },
    });
    
    console.log(`✅ Deleted ${orphanedSchedules.length} orphaned schedule(s).`);
  }

  // Also disable any remaining active schedules if needed
  const remainingActive = await prisma.scheduledWorkflow.findMany({
    where: { enabled: true },
  });

  if (remainingActive.length > 0) {
    console.log(`\n📋 ${remainingActive.length} active schedule(s) remaining (valid nodes).`);
    console.log("   To disable all schedules, run with --disable-all flag");
    
    if (process.argv.includes("--disable-all")) {
      await prisma.scheduledWorkflow.updateMany({
        where: { enabled: true },
        data: { enabled: false },
      });
      console.log("✅ Disabled all remaining schedules.");
    }
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
