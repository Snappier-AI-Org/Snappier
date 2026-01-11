"use client";

import * as DialogPrimitive from "@radix-ui/react-dialog";
import { PanelRightIcon, XIcon } from "lucide-react";
import { useState, useCallback, type ReactNode, type RefObject, type ComponentProps } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { DIALOG_IGNORE_INTERACT_OUTSIDE_ATTR } from "@/components/ui/dialog";
import type { WorkflowVariableGroup } from "../lib/workflow-variables";
import { VariableTokenList } from "./workflow-variables-panel";

interface WorkflowVariableGroupsListProps {
  variables: WorkflowVariableGroup[];
  highlightNodeId?: string;
}

const WorkflowVariableGroupsList = ({
  variables,
  highlightNodeId,
}: WorkflowVariableGroupsListProps) => (
  <div className="space-y-3">
    {variables.map((group) => (
      <div
        key={group.nodeId}
        className={cn(
          "rounded-xl border bg-background/60 p-3",
          group.nodeId === highlightNodeId
            ? "border-primary/70"
            : "border-border"
        )}
      >
        <div className="flex flex-col gap-0.5 text-sm">
          <span className="font-medium text-foreground">{group.nodeLabel}</span>
          {group.variableName ? (
            <span className="text-xs text-muted-foreground">
              Variable: <code>{group.variableName}</code>
            </span>
          ) : null}
        </div>
        <div className="mt-3">
          <VariableTokenList
            variables={group.variables}
            emptyMessage="This node has no variables yet"
          />
        </div>
      </div>
    ))}
  </div>
);

interface ConfigurationPanelLayoutProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: ReactNode;
  workflowVariables?: WorkflowVariableGroup[];
  currentNodeId?: string;
  dialogContentRef?: RefObject<HTMLDivElement | null>;
  className?: string;
}

export const ConfigurationPanelLayout = ({
  open,
  onOpenChange,
  children,
  workflowVariables = [],
  currentNodeId,
  dialogContentRef,
  className,
}: ConfigurationPanelLayoutProps) => {
  const [isVariablesPanelOpen, setIsVariablesPanelOpen] = useState(false);

  const hasVariables = workflowVariables.length > 0;

  const toggleVariablesPanel = () => {
    setIsVariablesPanelOpen((prev) => !prev);
  };

  // Close the panel when dialog closes
  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setIsVariablesPanelOpen(false);
    }
    onOpenChange(open);
  };

  // Prevent dialog from closing when interacting with elements that should be ignored
  // (e.g., the variables panel or variable buttons)
  type InteractOutsideEvent = Parameters<
    NonNullable<
      ComponentProps<typeof DialogPrimitive.Content>["onInteractOutside"]
    >
  >[0];

  const handleInteractOutside = useCallback(
    (event: InteractOutsideEvent) => {
      const target = event.target as HTMLElement | null;
      // Prevent closing if clicking on elements with the ignore attribute
      // This includes the variables panel and any variable buttons
      if (target?.closest(`[${DIALOG_IGNORE_INTERACT_OUTSIDE_ATTR}="true"]`)) {
        event.preventDefault();
      }
    },
    []
  );

  return (
    <DialogPrimitive.Root open={open} onOpenChange={handleOpenChange}>
      <DialogPrimitive.Portal>
        {/* Overlay */}
        <DialogPrimitive.Overlay
          className={cn(
            "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 fixed inset-0 z-50 bg-black/50"
          )}
        />

        {/* Container for both panels - positioned above overlay */}
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
          <div
            className={cn(
              "flex items-start gap-5 pointer-events-auto",
              "max-w-[calc(100vw-2rem)]",
              isVariablesPanelOpen && hasVariables ? "justify-center" : ""
            )}
          >
            {/* Main Configuration Panel */}
            <DialogPrimitive.Content
              ref={dialogContentRef}
              onInteractOutside={handleInteractOutside}
              className={cn(
                "bg-background data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 grid w-full gap-4 rounded-lg border p-6 shadow-lg duration-200 relative",
                "max-h-[calc(100vh-4rem)] overflow-y-auto",
                "max-w-lg sm:max-w-xl md:max-w-2xl",
                className
              )}
            >
              {/* Toggle button for workflow variables */}
              {hasVariables && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={toggleVariablesPanel}
                  className={cn(
                    "absolute top-4 right-12 h-8 gap-1.5 rounded-md px-3 text-xs font-medium transition-all",
                    isVariablesPanelOpen
                      ? "bg-primary text-primary-foreground border-primary hover:bg-primary/90 hover:border-primary/90"
                      : "bg-background border-border hover:border-primary hover:text-primary"
                  )}
                >
                  <PanelRightIcon className="size-3.5" />
                  <span className="hidden sm:inline">Variables</span>
                </Button>
              )}

              {/* Close button */}
              <DialogPrimitive.Close className="ring-offset-background focus:ring-ring data-[state=open]:bg-accent data-[state=open]:text-muted-foreground absolute top-4 right-4 rounded-xs opacity-70 transition-opacity hover:opacity-100 focus:ring-2 focus:ring-offset-2 focus:outline-hidden disabled:pointer-events-none [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4">
                <XIcon />
                <span className="sr-only">Close</span>
              </DialogPrimitive.Close>

              {children}
            </DialogPrimitive.Content>

            {/* Workflow Variables Side Panel */}
            {hasVariables && (
              <aside
                data-dialog-ignore-interact-outside="true"
                className={cn(
                  "bg-background rounded-xl border shadow-lg transition-all duration-200 ease-out",
                  "w-80 max-w-sm flex-shrink-0",
                  "max-h-[calc(100vh-4rem)] overflow-hidden flex flex-col",
                  isVariablesPanelOpen
                    ? "opacity-100 translate-x-0 pointer-events-auto"
                    : "opacity-0 translate-x-4 pointer-events-none absolute"
                )}
              >
                {/* Header with primary accent */}
                <div className="flex items-start justify-between border-b border-primary/30 bg-primary/5 px-4 py-3 shrink-0">
                  <div className="space-y-0.5 pr-2">
                    <p className="text-sm font-semibold text-foreground flex items-center gap-2">
                      <PanelRightIcon className="size-4 text-primary" />
                      Workflow Variables
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Copy variables from any existing node without closing this
                      dialog.
                    </p>
                  </div>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="size-7 rounded-full shrink-0 hover:bg-primary/10 hover:text-primary"
                    onClick={toggleVariablesPanel}
                    aria-label="Close workflow variables"
                  >
                    <XIcon className="size-3.5" />
                  </Button>
                </div>

                {/* Content - scrollable */}
                <div className="flex-1 overflow-y-auto px-4 py-4 pr-2">
                  <WorkflowVariableGroupsList
                    variables={workflowVariables}
                    highlightNodeId={currentNodeId}
                  />
                </div>
              </aside>
            )}
          </div>
        </div>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
};

// Export reusable dialog parts for use inside ConfigurationPanelLayout
export function ConfigDialogHeader({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      className={cn("flex flex-col gap-2 text-center sm:text-left", className)}
      {...props}
    />
  );
}

export function ConfigDialogTitle({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Title>) {
  return (
    <DialogPrimitive.Title
      className={cn("text-lg leading-none font-semibold", className)}
      {...props}
    />
  );
}

export function ConfigDialogDescription({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Description>) {
  return (
    <DialogPrimitive.Description
      className={cn("text-muted-foreground text-sm", className)}
      {...props}
    />
  );
}

export function ConfigDialogFooter({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "flex flex-col-reverse gap-2 sm:flex-row sm:justify-end",
        className
      )}
      {...props}
    />
  );
}

