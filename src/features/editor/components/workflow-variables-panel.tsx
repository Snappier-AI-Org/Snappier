"use client";

import { InfoIcon, VariableIcon, XIcon } from "lucide-react";
import { toast } from "sonner";
import { useEffect, useState, type RefObject } from "react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type {
  VariableToken,
  WorkflowVariableGroup,
} from "../lib/workflow-variables";

const copyToken = async (token: string) => {
  try {
    await navigator.clipboard.writeText(token);
    toast.success("Variable copied to clipboard");
  } catch (error) {
    toast.error("Failed to copy variable");
    console.error(error);
  }
};

export const VariableTokenList = ({
  variables,
  emptyMessage = "No variables available yet",
}: {
  variables: VariableToken[];
  emptyMessage?: string;
}) => {
  if (!variables.length) {
    return <p className="text-sm text-muted-foreground">{emptyMessage}</p>;
  }

  return (
    <div className="flex flex-wrap gap-2">
      {variables.map((variable) => (
        <Tooltip key={variable.token}>
          <TooltipTrigger asChild>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-8 rounded-full border-dashed px-3 text-xs font-medium"
              aria-label={`Copy ${variable.label ?? variable.token}`}
              onClick={() => copyToken(variable.token)}
            >
              <span>{variable.label ?? variable.token}</span>
              <InfoIcon className="size-3" aria-hidden="true" />
            </Button>
          </TooltipTrigger>
          <TooltipContent className="max-w-xs text-left">
            <div className="space-y-1.5">
              <code className="block font-mono text-xs text-background">
                {variable.token}
              </code>
              {variable.description ? (
                <p className="text-[11px] leading-snug text-background/80">
                  {variable.description}
                </p>
              ) : null}
              <p className="text-[10px] uppercase tracking-wide text-background/70">
                Click to copy
              </p>
            </div>
          </TooltipContent>
        </Tooltip>
      ))}
    </div>
  );
};

const WorkflowVariableGroupsList = ({
  variables,
  highlightNodeId,
}: {
  variables: WorkflowVariableGroup[];
  highlightNodeId?: string;
}) => (
  <div className="space-y-3">
    {variables.map((group) => (
      <div
        key={group.nodeId}
        className={cn(
          "rounded-xl border bg-background/60 p-3",
          group.nodeId === highlightNodeId
            ? "border-primary/70"
            : "border-border",
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

interface WorkflowVariablesPanelProps {
  variables: WorkflowVariableGroup[];
  highlightNodeId?: string;
  className?: string;
}

export const WorkflowVariablesPanel = ({
  variables,
  highlightNodeId,
  className,
}: WorkflowVariablesPanelProps) => {
  if (!variables.length) {
    return null;
  }

  return (
    <aside
      className={cn(
        "w-full max-w-sm rounded-2xl border bg-muted/30 p-4",
        className,
      )}
    >
      <div className="space-y-0.5">
        <p className="text-sm font-medium">Workflow variables</p>
        <p className="text-xs text-muted-foreground">
          Copy variables from any previous node without closing this dialog.
        </p>
      </div>

      <div className="mt-4 max-h-[420px] overflow-y-auto pr-1">
        <WorkflowVariableGroupsList
          variables={variables}
          highlightNodeId={highlightNodeId}
        />
      </div>
    </aside>
  );
};

interface WorkflowVariablesMiniModalProps {
  variables: WorkflowVariableGroup[];
  highlightNodeId?: string;
  dialogOpen: boolean;
  anchorRef?: RefObject<HTMLElement | null>;
}

export const WorkflowVariablesMiniModal = ({
  variables,
  highlightNodeId,
  dialogOpen,
  anchorRef,
}: WorkflowVariablesMiniModalProps) => {
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [buttonPosition, setButtonPosition] = useState<{
    top: number;
    right: number;
  } | null>(null);
  const [panelPosition, setPanelPosition] = useState<{
    top: number;
    right: number;
  } | null>(null);

  useEffect(() => {
    if (!dialogOpen) {
      setButtonPosition(null);
      setPanelPosition(null);
      return;
    }

    const anchorElement = anchorRef?.current;

    if (!anchorElement) {
      setButtonPosition(null);
      setPanelPosition(null);
      return;
    }

    const BUTTON_OFFSET_TOP = 16;
    const BUTTON_OFFSET_RIGHT = 16;
    const PANEL_WIDTH = 292;
    const PANEL_GAP = 16;

    const updatePosition = () => {
      const rect = anchorElement.getBoundingClientRect();
      
      // Button position - top-right corner of the dialog, outside of it
      const buttonTop = rect.top + BUTTON_OFFSET_TOP;
      const buttonRight = window.innerWidth - rect.right + BUTTON_OFFSET_RIGHT;
      
      setButtonPosition({
        top: Math.max(buttonTop, BUTTON_OFFSET_TOP),
        right: Math.max(buttonRight, BUTTON_OFFSET_RIGHT),
      });

      // Panel position - to the right of the dialog
      const panelRight = window.innerWidth - rect.right - PANEL_GAP - PANEL_WIDTH;
      setPanelPosition({
        top: Math.max(rect.top, PANEL_GAP),
        right: Math.max(-panelRight, PANEL_GAP),
      });
    };

    updatePosition();

    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);

    const resizeObserver = new ResizeObserver(() => updatePosition());
    resizeObserver.observe(anchorElement);

    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
      resizeObserver.disconnect();
    };
  }, [anchorRef, dialogOpen]);

  useEffect(() => {
    if (!dialogOpen) {
      setIsPanelOpen(false);
    }
  }, [dialogOpen]);

  if (!dialogOpen || !variables.length) {
    return null;
  }

  const togglePanel = () => {
    setIsPanelOpen((prev) => !prev);
  };

  return (
    <>
      {/* Toggle button - positioned at top-right of dialog */}
      <Button
        type="button"
        onClick={togglePanel}
        aria-expanded={isPanelOpen}
        className={cn(
          "fixed z-50 flex items-center gap-2 rounded-full border-2 px-4 py-2 text-sm font-semibold shadow-lg transition-all",
          isPanelOpen
            ? "bg-primary border-primary text-primary-foreground hover:bg-primary/90"
            : "bg-background border-border text-foreground hover:border-primary dark:bg-card",
        )}
        style={
          buttonPosition
            ? { top: buttonPosition.top, right: buttonPosition.right }
            : { top: 24, right: 24 }
        }
      >
        <VariableIcon className="size-4" />
        Workflow Variables
      </Button>

      {/* Panel - same dimensions as Add Node Panel */}
      <div
        className={cn(
          "fixed z-50 w-[292px] h-[396px] bg-background border border-border rounded-3xl shadow-lg overflow-hidden flex flex-col transition-all duration-200 dark:bg-card",
          isPanelOpen
            ? "opacity-100 translate-x-0 pointer-events-auto"
            : "opacity-0 translate-x-4 pointer-events-none",
        )}
        style={
          panelPosition
            ? { top: panelPosition.top, right: panelPosition.right }
            : { top: 24, right: 24 }
        }
      >
        {/* Header */}
        <div className="flex items-start justify-between border-b border-border px-4 py-3 shrink-0">
          <div className="space-y-0.5">
            <p className="text-base font-semibold text-foreground">
              Workflow variables
            </p>
            <p className="text-xs text-muted-foreground">
              Copy variables from any previous node without closing this panel.
            </p>
          </div>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="size-8 rounded-full text-muted-foreground hover:bg-accent shrink-0"
            onClick={togglePanel}
            aria-label="Close workflow variables"
          >
            <XIcon className="size-4" />
          </Button>
        </div>

        {/* Content - scrollable */}
        <div className="flex-1 overflow-y-auto px-4 py-4 pr-2">
          <WorkflowVariableGroupsList
            variables={variables}
            highlightNodeId={highlightNodeId}
          />
        </div>
      </div>
    </>
  );
};
