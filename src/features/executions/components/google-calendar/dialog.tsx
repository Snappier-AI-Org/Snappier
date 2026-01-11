"use client";

import z from "zod";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { CredentialSelect } from "@/features/credentials/components/credential-select";
import { CredentialType } from "@/generated/prisma";
import {
  ConfigDialogDescription,
  ConfigDialogFooter,
  ConfigDialogHeader,
  ConfigDialogTitle,
  ConfigurationPanelLayout,
} from "@/features/editor/components/configuration-panel-layout";
import { VariableTokenList } from "@/features/editor/components/workflow-variables-panel";
import type { WorkflowVariableGroup } from "@/features/editor/lib/workflow-variables";
import { getGoogleCalendarVariables } from "@/features/editor/lib/workflow-variables";
import { HelpCircle } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// =============================================================================
// Schema
// =============================================================================

const formSchema = z.object({
  variableName: z
    .string()
    .min(1, { message: "Variable name is required" })
    .regex(/^[A-Za-z_$][A-Za-z0-9_$]*$/, {
      message:
        "Variable name must start with a letter or underscore and contain only letters, numbers, and underscores",
    }),
  credentialId: z.string().min(1, "Credential is required"),
  calendarId: z.string().optional(),
  operation: z.enum(["list", "get", "create", "update", "delete", "listCalendars"]),
  eventId: z.string().optional(),
  summary: z.string().optional(),
  description: z.string().optional(),
  location: z.string().optional(),
  startDateTime: z.string().optional(),
  endDateTime: z.string().optional(),
  timeZone: z.string().optional(),
  attendees: z.string().optional(),
  maxResults: z.string().optional(),
  timeMin: z.string().optional(),
  timeMax: z.string().optional(),
});

export type GoogleCalendarFormValues = z.infer<typeof formSchema>;

// =============================================================================
// Helpers
// =============================================================================

const OPERATION_INFO: Record<string, { label: string; description: string }> = {
  listCalendars: { label: "📅 List Calendars", description: "See all your calendars" },
  list: { label: "📋 List Events", description: "Get upcoming events from a calendar" },
  get: { label: "🔍 Get Event", description: "Get details of a specific event" },
  create: { label: "➕ Create Event", description: "Create a new calendar event" },
  update: { label: "✏️ Update Event", description: "Modify an existing event" },
  delete: { label: "🗑️ Delete Event", description: "Remove an event from calendar" },
};

// =============================================================================
// Component
// =============================================================================

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: GoogleCalendarFormValues) => void;
  defaultValues?: Partial<GoogleCalendarFormValues>;
  workflowVariables?: WorkflowVariableGroup[];
  currentNodeId?: string;
}

export const GoogleCalendarDialog = ({
  open,
  onOpenChange,
  onSubmit,
  defaultValues = {},
  workflowVariables = [],
  currentNodeId,
}: Props) => {
  const dialogContentRef = useRef<HTMLDivElement>(null);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      variableName: defaultValues.variableName || "",
      credentialId: defaultValues.credentialId || "",
      calendarId: defaultValues.calendarId || "primary",
      operation: defaultValues.operation || "list",
      eventId: defaultValues.eventId || "",
      summary: defaultValues.summary || "",
      description: defaultValues.description || "",
      location: defaultValues.location || "",
      startDateTime: defaultValues.startDateTime || "",
      endDateTime: defaultValues.endDateTime || "",
      timeZone: defaultValues.timeZone || "",
      attendees: defaultValues.attendees || "",
      maxResults: defaultValues.maxResults || "10",
      timeMin: defaultValues.timeMin || "",
      timeMax: defaultValues.timeMax || "",
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        variableName: defaultValues.variableName || "",
        credentialId: defaultValues.credentialId || "",
        calendarId: defaultValues.calendarId || "primary",
        operation: defaultValues.operation || "list",
        eventId: defaultValues.eventId || "",
        summary: defaultValues.summary || "",
        description: defaultValues.description || "",
        location: defaultValues.location || "",
        startDateTime: defaultValues.startDateTime || "",
        endDateTime: defaultValues.endDateTime || "",
        timeZone: defaultValues.timeZone || "",
        attendees: defaultValues.attendees || "",
        maxResults: defaultValues.maxResults || "10",
        timeMin: defaultValues.timeMin || "",
        timeMax: defaultValues.timeMax || "",
      });
    }
  }, [open, defaultValues, form]);

  const watchVariableName = form.watch("variableName") || "myCalendar";
  const watchOperation = form.watch("operation");

  const handleSubmit = (values: GoogleCalendarFormValues) => {
    onSubmit(values);
    onOpenChange(false);
  };

  // Fields needed based on operation
  const needsCalendarId = watchOperation !== "listCalendars";
  const needsEventId = ["get", "update", "delete"].includes(watchOperation);
  const needsEventDetails = ["create", "update"].includes(watchOperation);
  const needsListParams = watchOperation === "list";

  return (
    <ConfigurationPanelLayout
      open={open}
      onOpenChange={onOpenChange}
      workflowVariables={workflowVariables}
      currentNodeId={currentNodeId}
      dialogContentRef={dialogContentRef}
      className="max-w-2xl"
    >
      <ConfigDialogHeader>
        <ConfigDialogTitle className="flex items-center gap-2">
          <img src="/logos/google-calendar.svg" alt="Google Calendar" className="w-6 h-6" />
          Configure Google Calendar Action
        </ConfigDialogTitle>
        <ConfigDialogDescription>
          Set up what this node should do with your calendar.
        </ConfigDialogDescription>
      </ConfigDialogHeader>

      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(handleSubmit)}
          className="space-y-6 mt-4"
        >
          {/* Variable Name */}
          <FormField
            control={form.control}
            name="variableName"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="flex items-center gap-2">
                  Output Variable Name
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <HelpCircle className="w-4 h-4 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs">
                        <p>Use this name to access the result in later nodes.</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </FormLabel>
                <FormControl>
                  <Input placeholder="myCalendar" {...field} />
                </FormControl>
                {watchVariableName && (
                  <div className="rounded-md border bg-muted/40 p-3 mt-2">
                    <p className="text-xs font-medium text-muted-foreground mb-2">
                      Available outputs (click to copy):
                    </p>
                    <VariableTokenList
                      variables={getGoogleCalendarVariables(watchVariableName)}
                      emptyMessage=""
                    />
                  </div>
                )}
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Credential Selection */}
          <FormField
            control={form.control}
            name="credentialId"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="flex items-center gap-2">
                  Google Account
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <HelpCircle className="w-4 h-4 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs">
                        <p>Select which Google account to use. You can connect accounts in the Credentials page.</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </FormLabel>
                <FormControl>
                  <CredentialSelect
                    type={CredentialType.GOOGLE_CALENDAR}
                    value={field.value}
                    onChange={field.onChange}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Operation Selection */}
          <FormField
            control={form.control}
            name="operation"
            render={({ field }) => (
              <FormItem>
                <FormLabel>What do you want to do?</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  value={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select an operation" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {Object.entries(OPERATION_INFO).map(([key, info]) => (
                      <SelectItem key={key} value={key}>
                        {info.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormDescription>
                  {OPERATION_INFO[watchOperation]?.description}
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Calendar ID */}
          {needsCalendarId && (
            <FormField
              control={form.control}
              name="calendarId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    Calendar
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <HelpCircle className="w-4 h-4 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent className="max-w-sm">
                          <p>Use "primary" for your main calendar, or use the List Calendars operation to find other calendar IDs.</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </FormLabel>
                  <FormControl>
                    <Input placeholder="primary" {...field} />
                  </FormControl>
                  <FormDescription>
                    Enter "primary" for your main calendar
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          {/* Event ID */}
          {needsEventId && (
            <FormField
              control={form.control}
              name="eventId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    Event ID
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <HelpCircle className="w-4 h-4 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent className="max-w-sm">
                          <p>Get the Event ID from a List Events operation.</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </FormLabel>
                  <FormControl>
                    <Input placeholder="Use {{previousNode.event.id}}" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          {/* List Parameters */}
          {needsListParams && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">🔍 Filter Events</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="maxResults"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Max Results</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="10" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="timeMin"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>From Date (Optional)</FormLabel>
                        <FormControl>
                          <Input
                            type="datetime-local"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="timeMax"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>To Date (Optional)</FormLabel>
                        <FormControl>
                          <Input
                            type="datetime-local"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Event Details */}
          {needsEventDetails && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">📅 Event Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="summary"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Event Title</FormLabel>
                      <FormControl>
                        <Input placeholder="Team Meeting" {...field} />
                      </FormControl>
                      <FormDescription>
                        Use <code className="text-xs bg-muted px-1 rounded">{"{{trigger.data.title}}"}</code> for dynamic values
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description (Optional)</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Discuss quarterly goals..."
                          className="min-h-[80px]"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="location"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Location (Optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="Conference Room A or Zoom link" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="startDateTime"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Start Date & Time</FormLabel>
                        <FormControl>
                          <Input
                            type="datetime-local"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="endDateTime"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>End Date & Time</FormLabel>
                        <FormControl>
                          <Input
                            type="datetime-local"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="timeZone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Time Zone (Optional)</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || "default"}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Use calendar's timezone" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="default">🌐 Use calendar's timezone</SelectItem>
                          <SelectItem value="America/New_York">🇺🇸 New York (EST/EDT)</SelectItem>
                          <SelectItem value="America/Los_Angeles">🇺🇸 Los Angeles (PST/PDT)</SelectItem>
                          <SelectItem value="America/Chicago">🇺🇸 Chicago (CST/CDT)</SelectItem>
                          <SelectItem value="Europe/London">🇬🇧 London (GMT/BST)</SelectItem>
                          <SelectItem value="Europe/Paris">🇫🇷 Paris (CET/CEST)</SelectItem>
                          <SelectItem value="Asia/Tokyo">🇯🇵 Tokyo (JST)</SelectItem>
                          <SelectItem value="Asia/Shanghai">🇨🇳 Shanghai (CST)</SelectItem>
                          <SelectItem value="Asia/Singapore">🇸🇬 Singapore (SGT)</SelectItem>
                          <SelectItem value="Australia/Sydney">🇦🇺 Sydney (AEST/AEDT)</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="attendees"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Attendees (Optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="email1@example.com, email2@example.com" {...field} />
                      </FormControl>
                      <FormDescription>
                        Comma-separated email addresses
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>
          )}

          <ConfigDialogFooter className="mt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">Save Configuration</Button>
          </ConfigDialogFooter>
        </form>
      </Form>
    </ConfigurationPanelLayout>
  );
};
