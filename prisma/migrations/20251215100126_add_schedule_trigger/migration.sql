-- CreateEnum
CREATE TYPE "ScheduleType" AS ENUM ('CRON', 'INTERVAL', 'DAILY', 'WEEKLY', 'MONTHLY');

-- AlterEnum
ALTER TYPE "NodeType" ADD VALUE 'SCHEDULE_TRIGGER';

-- CreateTable
CREATE TABLE "ScheduledWorkflow" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "workflowId" TEXT NOT NULL,
    "nodeId" TEXT NOT NULL,
    "scheduleType" "ScheduleType" NOT NULL,
    "timezone" TEXT NOT NULL DEFAULT 'UTC',
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "cronExpression" TEXT,
    "intervalValue" INTEGER,
    "intervalUnit" TEXT,
    "hour" INTEGER,
    "minute" INTEGER,
    "daysOfWeek" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
    "dayOfMonth" INTEGER,
    "nextRunAt" TIMESTAMP(3),
    "lastRunAt" TIMESTAMP(3),
    "lastExecutionId" TEXT,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ScheduledWorkflow_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ScheduledWorkflow_userId_idx" ON "ScheduledWorkflow"("userId");

-- CreateIndex
CREATE INDEX "ScheduledWorkflow_enabled_nextRunAt_idx" ON "ScheduledWorkflow"("enabled", "nextRunAt");

-- CreateIndex
CREATE UNIQUE INDEX "ScheduledWorkflow_workflowId_nodeId_key" ON "ScheduledWorkflow"("workflowId", "nodeId");
