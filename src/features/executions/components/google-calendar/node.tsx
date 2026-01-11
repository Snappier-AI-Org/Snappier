"use client";

import { useReactFlow, type Node, type NodeProps } from "@xyflow/react";
import { memo, useState } from "react";
import { BaseExecutionNode } from "../base-execution-node";
import { useNodeStatus } from "../../hooks/use-node-status";
import { fetchGoogleCalendarRealtimeToken } from "./actions";
import { GOOGLE_CALENDAR_CHANNEL_NAME } from "@/inngest/channels/google-calendar";
import { GoogleCalendarDialog, type GoogleCalendarFormValues } from "./dialog";
import { useWorkflowId } from "@/features/editor/context/workflow-context";
import { useLatestExecution } from "@/features/executions/hooks/use-executions";
import { parseError } from "@/features/executions/lib/error-parser";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useWorkflowVariables } from "@/features/editor/hooks/use-workflow-variables";

type GoogleCalendarNodeData = {
  credentialId?: string;
  calendarId?: string;
  operation?: "list" | "get" | "create" | "update" | "delete" | "listCalendars";
  eventId?: string;
  summary?: string;
  description?: string;
  location?: string;
  startDateTime?: string;
  endDateTime?: string;
  timeZone?: string;
  attendees?: string;
  maxResults?: string;
  timeMin?: string;
  timeMax?: string;
  variableName?: string;
};

type GoogleCalendarNodeType = Node<GoogleCalendarNodeData>;

export const GoogleCalendarNode = memo((props: NodeProps<GoogleCalendarNodeType>) => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const { setNodes } = useReactFlow();
  const workflowVariables = useWorkflowVariables();

  // Get workflowId from context (may not be available in all contexts)
  let workflowId: string | undefined;
  try {
    workflowId = useWorkflowId();
  } catch {
    // Not in workflow context, that's okay
  }

  const { data: latestExecution } = useLatestExecution(workflowId);
  const nodeStatus = useNodeStatus({
    nodeId: props.id,
    channel: GOOGLE_CALENDAR_CHANNEL_NAME,
    topic: "status",
    refreshToken: fetchGoogleCalendarRealtimeToken,
  });

  // Get error message if node is in error state and execution has an error
  const parsedError = nodeStatus === "error" && latestExecution?.error
    ? parseError(new Error(latestExecution.error))
    : null;

  const errorMessage = parsedError?.message || null;
  const errorGuidance = parsedError?.guidance || null;
  const errorFixSteps = parsedError?.fixSteps || [];

  const handleOpenSettings = () => setDialogOpen(true);

  const handleSubmit = (values: GoogleCalendarFormValues) => {
    setNodes((nodes) =>
      nodes.map((node) => {
        if (node.id === props.id) {
          return {
            ...node,
            data: {
              ...node.data,
              ...values,
            },
          };
        }
        return node;
      })
    );
  };

  const nodeData = props.data;
  const operation = nodeData?.operation || "list";
  const operationLabels: Record<string, string> = {
    list: "List Events",
    get: "Get Event",
    create: "Create Event",
    update: "Update Event",
    delete: "Delete Event",
    listCalendars: "List Calendars",
  };
  const description = nodeData?.credentialId
    ? operationLabels[operation] || operation
    : "Not configured";

  const nodeContent = (
    <BaseExecutionNode
      {...props}
      id={props.id}
      icon="/logos/google-calendar.svg"
      name="Google Calendar"
      description={description}
      status={nodeStatus}
      onSettings={handleOpenSettings}
      onDoubleClick={handleOpenSettings}
    />
  );

  return (
    <>
      <GoogleCalendarDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSubmit={handleSubmit}
        defaultValues={nodeData}
        workflowVariables={workflowVariables}
        currentNodeId={props.id}
      />

      {errorMessage ? (
        <Tooltip>
          <TooltipTrigger asChild>{nodeContent}</TooltipTrigger>
          <TooltipContent className="max-w-md bg-destructive text-destructive-foreground">
            <div className="space-y-3">
              <div>
                <p className="font-semibold mb-1">Error:</p>
                <p className="text-sm font-medium">{errorMessage}</p>
              </div>
              {errorGuidance && (
                <div>
                  <p className="text-xs font-semibold opacity-90 mb-1">
                    What went wrong:
                  </p>
                  <p className="text-xs opacity-90">{errorGuidance}</p>
                </div>
              )}
              {errorFixSteps.length > 0 && (
                <div className="pt-2 border-t border-white/20">
                  <p className="text-xs font-semibold opacity-90 mb-2">
                    How to fix:
                  </p>
                  <ol className="text-xs opacity-90 space-y-1 list-decimal list-inside">
                    {errorFixSteps.slice(0, 3).map((step, index) => (
                      <li key={index}>{step}</li>
                    ))}
                  </ol>
                </div>
              )}
            </div>
          </TooltipContent>
        </Tooltip>
      ) : (
        nodeContent
      )}
    </>
  );
});

GoogleCalendarNode.displayName = "GoogleCalendarNode";
