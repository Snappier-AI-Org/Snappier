"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { toast } from "sonner";
import { 
  CheckCircle2, 
  Loader2, 
  Power, 
  PowerOff, 
  Clock,
  CalendarDays,
  RotateCw,
  Calendar,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  saveSchedule,
  toggleSchedule,
  deleteSchedule,
  getScheduleStatus,
  type ScheduleConfig,
} from "./actions";
import { ScheduleType } from "@/generated/prisma";

const SCHEDULE_TRIGGER_VARIABLES = [
  {
    token: "{{scheduleTrigger.triggeredAt}}",
    label: "Triggered At",
    description: "When the schedule triggered (ISO timestamp)",
  },
  {
    token: "{{scheduleTrigger.nodeId}}",
    label: "Node ID",
    description: "The schedule trigger node ID",
  },
];

const DAYS_OF_WEEK = [
  { value: 0, label: "Sunday", short: "Sun" },
  { value: 1, label: "Monday", short: "Mon" },
  { value: 2, label: "Tuesday", short: "Tue" },
  { value: 3, label: "Wednesday", short: "Wed" },
  { value: 4, label: "Thursday", short: "Thu" },
  { value: 5, label: "Friday", short: "Fri" },
  { value: 6, label: "Saturday", short: "Sat" },
];

const TIMEZONES = [
  { value: "UTC", label: "UTC" },
  { value: "America/New_York", label: "Eastern Time (US)" },
  { value: "America/Chicago", label: "Central Time (US)" },
  { value: "America/Denver", label: "Mountain Time (US)" },
  { value: "America/Los_Angeles", label: "Pacific Time (US)" },
  { value: "Europe/London", label: "London" },
  { value: "Europe/Paris", label: "Paris" },
  { value: "Europe/Berlin", label: "Berlin" },
  { value: "Europe/Zagreb", label: "Zagreb" },
  { value: "Asia/Tokyo", label: "Tokyo" },
  { value: "Asia/Shanghai", label: "Shanghai" },
  { value: "Asia/Singapore", label: "Singapore" },
  { value: "Australia/Sydney", label: "Sydney" },
];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentNodeId?: string;
  nodeData?: ScheduleConfig;
  onNodeDataChange?: (data: ScheduleConfig) => void;
}

export const ScheduleTriggerDialog = ({
  open,
  onOpenChange,
  currentNodeId,
  nodeData,
  onNodeDataChange,
}: Props) => {
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingStatus, setIsCheckingStatus] = useState(false);
  const [isScheduleActive, setIsScheduleActive] = useState(false);
  const [nextRunAt, setNextRunAt] = useState<Date | undefined>();
  const [lastRunAt, setLastRunAt] = useState<Date | undefined>();

  // Form state
  const [scheduleType, setScheduleType] = useState<ScheduleType>(
    nodeData?.scheduleType || ScheduleType.DAILY
  );
  const [timezone, setTimezone] = useState(nodeData?.timezone || "UTC");
  const [cronExpression, setCronExpression] = useState(nodeData?.cronExpression || "");
  const [intervalValue, setIntervalValue] = useState(nodeData?.intervalValue || 1);
  const [intervalUnit, setIntervalUnit] = useState<"minutes" | "hours" | "days">(
    nodeData?.intervalUnit || "hours"
  );
  const [hour, setHour] = useState(nodeData?.hour ?? 9);
  const [minute, setMinute] = useState(nodeData?.minute ?? 0);
  const [daysOfWeek, setDaysOfWeek] = useState<number[]>(nodeData?.daysOfWeek || [1]);
  const [dayOfMonth, setDayOfMonth] = useState(nodeData?.dayOfMonth || 1);

  const params = useParams();
  const workflowId = params.workflowId as string;

  useEffect(() => {
    if (open) {
      checkScheduleStatus();
    }
  }, [open]);

  // Sync form state with nodeData
  useEffect(() => {
    if (nodeData) {
      setScheduleType(nodeData.scheduleType || ScheduleType.DAILY);
      setTimezone(nodeData.timezone || "UTC");
      setCronExpression(nodeData.cronExpression || "");
      setIntervalValue(nodeData.intervalValue || 1);
      setIntervalUnit(nodeData.intervalUnit || "hours");
      setHour(nodeData.hour ?? 9);
      setMinute(nodeData.minute ?? 0);
      setDaysOfWeek(nodeData.daysOfWeek || [1]);
      setDayOfMonth(nodeData.dayOfMonth || 1);
    }
  }, [nodeData]);

  const checkScheduleStatus = async () => {
    if (!workflowId || !currentNodeId) return;

    setIsCheckingStatus(true);
    try {
      const status = await getScheduleStatus(workflowId, currentNodeId);
      setIsScheduleActive(status.exists && status.enabled);
      setNextRunAt(status.nextRunAt);
      setLastRunAt(status.lastRunAt);

      // Load saved config if exists
      if (status.config) {
        setScheduleType(status.config.scheduleType);
        setTimezone(status.config.timezone);
        setCronExpression(status.config.cronExpression || "");
        setIntervalValue(status.config.intervalValue || 1);
        setIntervalUnit(status.config.intervalUnit || "hours");
        setHour(status.config.hour ?? 9);
        setMinute(status.config.minute ?? 0);
        setDaysOfWeek(status.config.daysOfWeek || [1]);
        setDayOfMonth(status.config.dayOfMonth || 1);
      }
    } catch (error) {
      console.error("Error checking schedule status:", error);
    } finally {
      setIsCheckingStatus(false);
    }
  };

  const buildConfig = (): ScheduleConfig => ({
    scheduleType,
    timezone,
    cronExpression: scheduleType === ScheduleType.CRON ? cronExpression : undefined,
    intervalValue: scheduleType === ScheduleType.INTERVAL ? intervalValue : undefined,
    intervalUnit: scheduleType === ScheduleType.INTERVAL ? intervalUnit : undefined,
    hour: (scheduleType === ScheduleType.DAILY || scheduleType === ScheduleType.WEEKLY || scheduleType === ScheduleType.MONTHLY)
      ? hour
      : undefined,
    minute: (scheduleType === ScheduleType.DAILY || scheduleType === ScheduleType.WEEKLY || scheduleType === ScheduleType.MONTHLY)
      ? minute
      : undefined,
    daysOfWeek: scheduleType === ScheduleType.WEEKLY ? daysOfWeek : undefined,
    dayOfMonth: scheduleType === ScheduleType.MONTHLY ? dayOfMonth : undefined,
  });

  const handleSaveSchedule = async () => {
    if (!workflowId || !currentNodeId) {
      toast.error("Missing workflow or node information");
      return;
    }

    // Validate based on schedule type
    if (scheduleType === ScheduleType.CRON && !cronExpression) {
      toast.error("Please enter a cron expression");
      return;
    }

    if (scheduleType === ScheduleType.WEEKLY && daysOfWeek.length === 0) {
      toast.error("Please select at least one day of the week");
      return;
    }

    setIsLoading(true);
    try {
      const config = buildConfig();
      const result = await saveSchedule(workflowId, currentNodeId, config);

      if (result.success) {
        toast.success("Schedule saved and activated!");
        setIsScheduleActive(true);
        onNodeDataChange?.(config);
        await checkScheduleStatus();
      } else {
        toast.error(result.error || "Failed to save schedule");
      }
    } catch (error) {
      console.error("Error saving schedule:", error);
      toast.error("Failed to save schedule");
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleSchedule = async () => {
    if (!workflowId || !currentNodeId) return;

    setIsLoading(true);
    try {
      const result = await toggleSchedule(workflowId, currentNodeId, !isScheduleActive);

      if (result.success) {
        setIsScheduleActive(!isScheduleActive);
        toast.success(isScheduleActive ? "Schedule paused" : "Schedule resumed");
      } else {
        toast.error(result.error || "Failed to toggle schedule");
      }
    } catch (error) {
      console.error("Error toggling schedule:", error);
      toast.error("Failed to toggle schedule");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteSchedule = async () => {
    if (!workflowId || !currentNodeId) return;

    setIsLoading(true);
    try {
      const result = await deleteSchedule(workflowId, currentNodeId);

      if (result.success) {
        setIsScheduleActive(false);
        setNextRunAt(undefined);
        setLastRunAt(undefined);
        toast.success("Schedule deleted");
      } else {
        toast.error(result.error || "Failed to delete schedule");
      }
    } catch (error) {
      console.error("Error deleting schedule:", error);
      toast.error("Failed to delete schedule");
    } finally {
      setIsLoading(false);
    }
  };

  const toggleDayOfWeek = (day: number) => {
    if (daysOfWeek.includes(day)) {
      setDaysOfWeek(daysOfWeek.filter((d) => d !== day));
    } else {
      setDaysOfWeek([...daysOfWeek, day].sort());
    }
  };

  const formatNextRun = (date?: Date) => {
    if (!date) return "Not scheduled";
    return new Intl.DateTimeFormat("en-US", {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: timezone,
    }).format(date);
  };

  const getScheduleDescription = () => {
    switch (scheduleType) {
      case ScheduleType.INTERVAL:
        return `Every ${intervalValue} ${intervalUnit}`;
      case ScheduleType.DAILY:
        return `Every day at ${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`;
      case ScheduleType.WEEKLY:
        const days = daysOfWeek
          .map((d) => DAYS_OF_WEEK.find((day) => day.value === d)?.short)
          .join(", ");
        return `Every ${days} at ${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`;
      case ScheduleType.MONTHLY:
        return `Monthly on day ${dayOfMonth} at ${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`;
      case ScheduleType.CRON:
        return `Cron: ${cronExpression || "(not set)"}`;
      default:
        return "Not configured";
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="size-5" />
            Schedule Trigger
          </DialogTitle>
          <DialogDescription>
            Configure when this workflow should run automatically.
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4 flex flex-col gap-6">
          {/* Status Banner */}
          {isCheckingStatus ? (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-muted">
              <Loader2 className="size-4 animate-spin" />
              <span className="text-sm">Checking schedule status...</span>
            </div>
          ) : isScheduleActive ? (
            <div className="flex items-center justify-between p-3 rounded-lg bg-[#0021F3]/10 border border-[#0021F3]/20">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="size-4 text-[#0021F3]" />
                <span className="text-sm font-medium text-[#0021F3] dark:text-[#5C70EA]">
                  Schedule Active
                </span>
              </div>
              <div className="text-sm text-muted-foreground">
                Next run: {formatNextRun(nextRunAt)}
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-muted">
              <PowerOff className="size-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                Schedule not active. Configure and save to activate.
              </span>
            </div>
          )}

          {/* Schedule Type Selection */}
          <div className="space-y-2">
            <Label>Schedule Type</Label>
            <Select
              value={scheduleType}
              onValueChange={(v) => setScheduleType(v as ScheduleType)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select schedule type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ScheduleType.INTERVAL}>
                  <div className="flex items-center gap-2">
                    <RotateCw className="size-4" />
                    Interval (every X minutes/hours)
                  </div>
                </SelectItem>
                <SelectItem value={ScheduleType.DAILY}>
                  <div className="flex items-center gap-2">
                    <Clock className="size-4" />
                    Daily (at specific time)
                  </div>
                </SelectItem>
                <SelectItem value={ScheduleType.WEEKLY}>
                  <div className="flex items-center gap-2">
                    <CalendarDays className="size-4" />
                    Weekly (specific days)
                  </div>
                </SelectItem>
                <SelectItem value={ScheduleType.MONTHLY}>
                  <div className="flex items-center gap-2">
                    <Calendar className="size-4" />
                    Monthly (specific day of month)
                  </div>
                </SelectItem>
                <SelectItem value={ScheduleType.CRON}>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs">*</span>
                    Cron Expression (advanced)
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Timezone Selection */}
          <div className="space-y-2">
            <Label>Timezone</Label>
            <Select value={timezone} onValueChange={setTimezone}>
              <SelectTrigger>
                <SelectValue placeholder="Select timezone" />
              </SelectTrigger>
              <SelectContent>
                {TIMEZONES.map((tz) => (
                  <SelectItem key={tz.value} value={tz.value}>
                    {tz.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Interval Settings */}
          {scheduleType === ScheduleType.INTERVAL && (
            <div className="space-y-2">
              <Label>Run every</Label>
              <div className="flex gap-2">
                <Input
                  type="number"
                  min={1}
                  value={intervalValue}
                  onChange={(e) => setIntervalValue(parseInt(e.target.value) || 1)}
                  className="w-24"
                />
                <Select
                  value={intervalUnit}
                  onValueChange={(v) => setIntervalUnit(v as "minutes" | "hours" | "days")}
                >
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="minutes">Minutes</SelectItem>
                    <SelectItem value="hours">Hours</SelectItem>
                    <SelectItem value="days">Days</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {/* Time Settings for Daily, Weekly, Monthly */}
          {(scheduleType === ScheduleType.DAILY || scheduleType === ScheduleType.WEEKLY || scheduleType === ScheduleType.MONTHLY) && (
            <div className="space-y-2">
              <Label>Time</Label>
              <div className="flex gap-2 items-center">
                <Input
                  type="number"
                  min={0}
                  max={23}
                  value={hour}
                  onChange={(e) => setHour(parseInt(e.target.value) || 0)}
                  className="w-20"
                  placeholder="HH"
                />
                <span className="text-lg">:</span>
                <Input
                  type="number"
                  min={0}
                  max={59}
                  value={minute}
                  onChange={(e) => setMinute(parseInt(e.target.value) || 0)}
                  className="w-20"
                  placeholder="MM"
                />
              </div>
            </div>
          )}

          {/* Weekly - Day Selection */}
          {scheduleType === ScheduleType.WEEKLY && (
            <div className="space-y-2">
              <Label>Days of Week</Label>
              <div className="flex flex-wrap gap-2">
                {DAYS_OF_WEEK.map((day) => (
                  <div key={day.value} className="flex items-center gap-2">
                    <Checkbox
                      id={`day-${day.value}`}
                      checked={daysOfWeek.includes(day.value)}
                      onCheckedChange={() => toggleDayOfWeek(day.value)}
                    />
                    <label
                      htmlFor={`day-${day.value}`}
                      className="text-sm cursor-pointer"
                    >
                      {day.short}
                    </label>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Monthly - Day of Month */}
          {scheduleType === ScheduleType.MONTHLY && (
            <div className="space-y-2">
              <Label>Day of Month</Label>
              <Input
                type="number"
                min={1}
                max={31}
                value={dayOfMonth}
                onChange={(e) => setDayOfMonth(parseInt(e.target.value) || 1)}
                className="w-24"
              />
              <p className="text-xs text-muted-foreground">
                If day doesn&apos;t exist (e.g., 31st in February), it will run on the last day of the month.
              </p>
            </div>
          )}

          {/* Cron Expression */}
          {scheduleType === ScheduleType.CRON && (
            <div className="space-y-2">
              <Label>Cron Expression</Label>
              <Input
                value={cronExpression}
                onChange={(e) => setCronExpression(e.target.value)}
                placeholder="0 9 * * 1-5"
                className="font-mono"
              />
              <p className="text-xs text-muted-foreground">
                Standard cron format: minute hour day-of-month month day-of-week
                <br />
                Example: <code className="bg-muted px-1 rounded">0 9 * * 1-5</code> = Weekdays at 9:00 AM
              </p>
            </div>
          )}

          {/* Schedule Preview */}
          <div className="p-3 rounded-lg bg-muted/50 border">
            <div className="text-sm font-medium mb-1">Schedule Preview</div>
            <div className="text-sm text-muted-foreground">
              {getScheduleDescription()} ({timezone})
            </div>
          </div>

          {/* Last Run Info */}
          {lastRunAt && (
            <div className="text-sm text-muted-foreground">
              Last run: {formatNextRun(lastRunAt)}
            </div>
          )}
        </div>

        <DialogFooter className="mt-6 gap-2">
          {isScheduleActive && (
            <>
              <Button
                variant="outline"
                onClick={handleToggleSchedule}
                disabled={isLoading}
              >
                {isLoading ? (
                  <Loader2 className="size-4 animate-spin mr-2" />
                ) : (
                  <PowerOff className="size-4 mr-2" />
                )}
                Pause Schedule
              </Button>
              <Button
                variant="destructive"
                onClick={handleDeleteSchedule}
                disabled={isLoading}
              >
                Delete Schedule
              </Button>
            </>
          )}
          <Button onClick={handleSaveSchedule} disabled={isLoading}>
            {isLoading ? (
              <Loader2 className="size-4 animate-spin mr-2" />
            ) : (
              <Power className="size-4 mr-2" />
            )}
            {isScheduleActive ? "Update Schedule" : "Save & Activate"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
