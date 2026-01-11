"use client";

import { createId } from "@paralleldrive/cuid2";
import { useReactFlow } from "@xyflow/react";
import {
  AlertTriangle,
  Brain,
  CheckSquare,
  Clock3,
  Code,
  Code2,
  Database,
  GitBranch,
  GlobeIcon,
  Link2Icon,
  Merge,
  MessageSquare,
  MousePointerIcon,
  Plus,
  Repeat,
  Search,
  Shuffle,
  Split,
  Variable,
  Zap,
} from "lucide-react";
import Image from "next/image";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { NodeType } from "@/generated/prisma";
import { useAddNodePanel } from "./add-node-panel-context";
import { INTEGRATION_CATEGORIES, type IntegrationCategoryId } from "@/config/integration-categories";

type NodeTypeOption = {
  type: NodeType;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }> | string;
};

// ============================================================================
// GROUPED NODES CONFIGURATION
// ============================================================================

const triggerNodes: NodeTypeOption[] = [
  {
    type: NodeType.MANUAL_TRIGGER,
    label: "Manual Trigger",
    description: "Runs the flow on clicking a button",
    icon: MousePointerIcon,
  },
  {
    type: NodeType.GOOGLE_FORM_TRIGGER,
    label: "Google Form Trigger",
    description: "Runs the flow when a Google Form is submitted",
    icon: "/logos/google-forms-icon.svg",
  },
  {
    type: NodeType.STRIPE_TRIGGER,
    label: "Stripe Trigger",
    description: "Runs the flow when a Stripe event is captured",
    icon: "/logos/stripe.svg",
  },
  {
    type: NodeType.GMAIL_TRIGGER,
    label: "Gmail Trigger",
    description: "Runs the flow when a new email is received",
    icon: "/logos/gmail.svg",
  },
  {
    type: NodeType.SCHEDULE_TRIGGER,
    label: "Schedule Trigger",
    description: "Runs the flow on a schedule",
    icon: "/logos/schedule.svg",
  },
  {
    type: NodeType.WEBHOOK_TRIGGER,
    label: "Webhook Trigger",
    description: "Runs the flow when a webhook is received",
    icon: Link2Icon,
  },
  {
    type: NodeType.DISCORD_TRIGGER,
    label: "Discord Trigger",
    description: "Runs the flow when a Discord message is received",
    icon: "/logos/discord.svg",
  },
  {
    type: NodeType.INSTAGRAM_TRIGGER,
    label: "Instagram Trigger",
    description: "Runs the flow on Instagram DMs, comments, or both",
    icon: "/logos/instagram.svg",
  },
];

// === LOGIC NODES ===
const logicNodes: NodeTypeOption[] = [
  {
    type: NodeType.FILTER_CONDITIONAL,
    label: "Filter / Conditional",
    description: "Branch workflow with if/else logic",
    icon: GitBranch,
  },
  {
    type: NodeType.DELAY_WAIT,
    label: "Delay / Wait",
    description: "Pause the flow for a set time",
    icon: Clock3,
  },
  {
    type: NodeType.SWITCH,
    label: "Switch",
    description: "Route to different outputs based on rules",
    icon: Shuffle,
  },
  {
    type: NodeType.CODE,
    label: "Code",
    description: "Execute custom JavaScript code",
    icon: Code2,
  },
  {
    type: NodeType.MERGE,
    label: "Merge",
    description: "Combine data from multiple inputs",
    icon: Merge,
  },
  {
    type: NodeType.SPLIT,
    label: "Split",
    description: "Split data into batches or groups",
    icon: Split,
  },
  {
    type: NodeType.LOOP,
    label: "Loop",
    description: "Iterate over items or repeat actions",
    icon: Repeat,
  },
  {
    type: NodeType.SET,
    label: "Set",
    description: "Set or modify workflow variables",
    icon: Variable,
  },
  {
    type: NodeType.ERROR_TRIGGER,
    label: "Error Trigger",
    description: "Handle errors from previous nodes",
    icon: AlertTriangle,
  },
];

// === AI NODES ===
const aiNodes: NodeTypeOption[] = [
  {
    type: NodeType.OPENAI,
    label: "OpenAI",
    description: "Uses OpenAI to generate text",
    icon: "/logos/openai.svg",
  },
  {
    type: NodeType.ANTHROPIC,
    label: "Anthropic (Claude)",
    description: "Uses Anthropic to generate text",
    icon: "/logos/anthropic.svg",
  },
  {
    type: NodeType.GEMINI,
    label: "Gemini",
    description: "Uses Google Gemini to generate text",
    icon: "/logos/gemini.svg",
  },
  {
    type: NodeType.GROQ,
    label: "Groq",
    description: "Ultra-fast inference for open-source LLMs",
    icon: "/logos/groq.svg",
  },
  {
    type: NodeType.HUGGINGFACE,
    label: "Hugging Face",
    description: "Access thousands of open-source AI models",
    icon: "/logos/huggingface.svg",
  },
  {
    type: NodeType.OPENROUTER,
    label: "OpenRouter",
    description: "Access 100+ AI models from multiple providers",
    icon: "/logos/openrouter.png",
  },
];

// === COMMUNICATION NODES ===
const communicationNodes: NodeTypeOption[] = [
  {
    type: NodeType.GMAIL,
    label: "Gmail",
    description: "Send, read, or manage emails",
    icon: "/logos/gmail.svg",
  },
  {
    type: NodeType.OUTLOOK,
    label: "Outlook",
    description: "Manage emails in Outlook",
    icon: "/logos/outlook.svg",
  },
  {
    type: NodeType.DISCORD,
    label: "Discord",
    description: "Send a message to Discord",
    icon: "/logos/discord.svg",
  },
  {
    type: NodeType.SLACK,
    label: "Slack",
    description: "Send a message to Slack",
    icon: "/logos/slack.svg",
  },
  {
    type: NodeType.TELEGRAM,
    label: "Telegram",
    description: "Send a message to Telegram",
    icon: "/logos/telegram.svg",
  },
  {
    type: NodeType.WHATSAPP,
    label: "WhatsApp",
    description: "Send a message via WhatsApp",
    icon: "/logos/whatsapp.svg",
  },
  {
    type: NodeType.ZALO,
    label: "Zalo Bot",
    description: "Send a message via Zalo Bot",
    icon: "/logos/zalo.svg",
  },
  {
    type: NodeType.INSTAGRAM_DM,
    label: "Instagram DM",
    description: "Send a direct message on Instagram",
    icon: "/logos/instagram.svg",
  },
  {
    type: NodeType.INSTAGRAM_COMMENT_REPLY,
    label: "Instagram Comment Reply",
    description: "Reply to an Instagram comment",
    icon: "/logos/instagram.svg",
  },
];

// === DATA NODES ===
const dataNodes: NodeTypeOption[] = [
  {
    type: NodeType.GOOGLE_SHEETS,
    label: "Google Sheets",
    description: "Read, append, or update data",
    icon: "/logos/google-sheets.svg",
  },
  {
    type: NodeType.GOOGLE_DRIVE,
    label: "Google Drive",
    description: "Manage files in Google Drive",
    icon: "/logos/google-drive.svg",
  },
  {
    type: NodeType.GOOGLE_CALENDAR,
    label: "Google Calendar",
    description: "Manage calendar events",
    icon: "/logos/google-calendar.svg",
  },
  {
    type: NodeType.GOOGLE_DOCS,
    label: "Google Docs",
    description: "Create, read, or edit documents",
    icon: "/logos/google-docs.svg",
  },
];

// === PRODUCTIVITY NODES ===
const productivityNodes: NodeTypeOption[] = [
  {
    type: NodeType.TRELLO,
    label: "Trello",
    description: "Manage Trello boards and cards",
    icon: "/logos/trello.svg",
  },
  {
    type: NodeType.NOTION,
    label: "Notion",
    description: "Manage Notion pages and databases",
    icon: "/logos/notion.svg",
  },
  {
    type: NodeType.GITHUB,
    label: "GitHub",
    description: "Manage GitHub repos and issues",
    icon: "/logos/github.svg",
  },
  {
    type: NodeType.TODOIST,
    label: "Todoist",
    description: "Manage tasks and projects in Todoist",
    icon: "/logos/todoist.svg",
  },
];

// === DEVELOPER NODES ===
const developerNodes: NodeTypeOption[] = [
  {
    type: NodeType.HTTP_REQUEST,
    label: "HTTP Request",
    description: "Makes an HTTP request",
    icon: GlobeIcon,
  },
];

// ============================================================================
// NODE SECTIONS CONFIGURATION (using category system)
// ============================================================================

type NodeSection = {
  id: IntegrationCategoryId;
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  nodes: NodeTypeOption[];
};

const nodeSections: NodeSection[] = [
  { 
    id: "triggers",
    title: INTEGRATION_CATEGORIES.triggers.label, 
    icon: Zap, 
    nodes: triggerNodes 
  },
  { 
    id: "logic",
    title: INTEGRATION_CATEGORIES.logic.label, 
    icon: GitBranch, 
    nodes: logicNodes 
  },
  { 
    id: "ai",
    title: INTEGRATION_CATEGORIES.ai.label, 
    icon: Brain, 
    nodes: aiNodes 
  },
  { 
    id: "communication",
    title: INTEGRATION_CATEGORIES.communication.label, 
    icon: MessageSquare, 
    nodes: communicationNodes 
  },
  { 
    id: "data",
    title: INTEGRATION_CATEGORIES.data.label, 
    icon: Database, 
    nodes: dataNodes 
  },
  { 
    id: "productivity",
    title: INTEGRATION_CATEGORIES.productivity.label, 
    icon: CheckSquare, 
    nodes: productivityNodes 
  },
  { 
    id: "developer",
    title: INTEGRATION_CATEGORIES.developer.label, 
    icon: Code, 
    nodes: developerNodes 
  },
];

// Node item renderer component - Cyber-Tech styled
const NodeItem = ({
  nodeType,
  onClick,
  onPointerDown,
}: {
  nodeType: NodeTypeOption;
  onClick: () => void;
  onPointerDown?: (event: React.PointerEvent<HTMLButtonElement>) => void;
}) => {
  const Icon = nodeType.icon;
  return (
    <button
      type="button"
      className="w-full text-left py-3 px-4 cursor-pointer bg-card hover:bg-accent border border-border hover:border-primary rounded-xl mb-2 transition-all duration-200 dark:bg-card/50 dark:hover:bg-primary/10"
      onClick={onClick}
      onPointerDown={onPointerDown}
      onKeyDown={(e) => e.key === "Enter" && onClick()}
    >
      <div className="flex items-center gap-3 w-full overflow-hidden">
        {typeof Icon === "string" ? (
          <div className="size-10 rounded-lg bg-background border border-border flex items-center justify-center shrink-0">
            <Image src={Icon} alt={nodeType.label} width={24} height={24} />
          </div>
        ) : (
          <div className="size-10 rounded-lg bg-background border border-border flex items-center justify-center shrink-0">
            <Icon className="size-5 text-muted-foreground" />
          </div>
        )}
        <div className="flex flex-col items-start min-w-0">
          <span className="font-semibold text-sm text-foreground">
            {nodeType.label}
          </span>
          <span className="text-xs text-muted-foreground line-clamp-2">
            {nodeType.description}
          </span>
        </div>
      </div>
    </button>
  );
};

// Section header component - Cyber-Tech styled
const SectionHeader = ({
  title,
  icon: Icon,
}: {
  title: string;
  icon?: React.ComponentType<{ className?: string }>;
}) => (
  <div className="flex items-center gap-2 px-1 py-2 sticky top-0 bg-background z-10">
    {Icon ? (
      <div className="size-7 rounded-lg bg-card border border-border flex items-center justify-center shrink-0">
        <Icon className="size-4 text-muted-foreground" />
      </div>
    ) : null}
    <span className="text-[13px] font-semibold tracking-wide text-foreground">
      {title.toUpperCase()}
    </span>
  </div>
);

export const AddNodePanel = memo(function AddNodePanel() {
  const [searchTerm, setSearchTerm] = useState("");
  const [activeFilter, setActiveFilter] = useState<IntegrationCategoryId | "all">("all");
  const { setNodes, getNodes, screenToFlowPosition } = useReactFlow();
  const { isOpen, setIsOpen } = useAddNodePanel();
  const dragMetaRef = useRef<{
    node: NodeTypeOption;
    startX: number;
    startY: number;
    isDragging: boolean;
  } | null>(null);
  const dragListenersRef = useRef<{
    move?: (event: PointerEvent) => void;
    up?: (event: PointerEvent) => void;
  }>({});
  // Track if a drag was completed to prevent onClick from also firing
  const dragCompletedRef = useRef(false);
  const [dragPreview, setDragPreview] = useState<{
    node: NodeTypeOption;
    x: number;
    y: number;
    overCanvas: boolean;
  } | null>(null);

  const filteredSections = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    
    let sections = nodeSections;
    
    // Apply category filter
    if (activeFilter !== "all") {
      sections = sections.filter((section) => section.id === activeFilter);
    }
    
    // Apply search filter
    if (term) {
      sections = sections
        .map((section) => ({
          ...section,
          nodes: section.nodes.filter((node) => {
            const label = node.label.toLowerCase();
            const description = node.description.toLowerCase();
            return label.includes(term) || description.includes(term);
          }),
        }))
        .filter((section) => section.nodes.length > 0);
    }

    return sections;
  }, [searchTerm, activeFilter]);

  const canAddManualTrigger = useCallback(
    (selection: NodeTypeOption) => {
      if (selection.type !== NodeType.MANUAL_TRIGGER) {
        return true;
      }

      const nodes = getNodes();
      const hasManualTrigger = nodes.some(
        (node) => node.type === NodeType.MANUAL_TRIGGER,
      );

      if (hasManualTrigger) {
        toast.error("Only one manual trigger is allowed per workflow.");
        return false;
      }

      return true;
    },
    [getNodes],
  );

  const addNodeToCanvas = useCallback(
    (
      selection: NodeTypeOption,
      options?: {
        position?: { x: number; y: number };
        keepPanelOpen?: boolean;
      },
    ) => {
      if (!canAddManualTrigger(selection)) {
        return;
      }

      setNodes((nodes) => {
        const hasInitialTrigger = nodes.some(
          (node) => node.type === NodeType.INITIAL,
        );

        let fallbackX = 400;
        let fallbackY = 200;

        if (!options?.position) {
          const reactFlowPane = document.querySelector(".react-flow__pane");
          if (reactFlowPane) {
            const rect = reactFlowPane.getBoundingClientRect();
            const screenCenterX = rect.left + rect.width / 2;
            const screenCenterY = rect.top + rect.height / 2;

            const flowPosition = screenToFlowPosition({
              x: screenCenterX,
              y: screenCenterY,
            });

            fallbackX = flowPosition.x;
            fallbackY = flowPosition.y;
          }
        }

        const randomOffsetX = (Math.random() - 0.5) * 100;
        const randomOffsetY = (Math.random() - 0.5) * 100;

        const position = options?.position ?? {
          x: fallbackX + randomOffsetX - 70,
          y: fallbackY + randomOffsetY - 50,
        };

        const newNode = {
          id: createId(),
          data: {},
          position,
          type: selection.type,
        };

        if (hasInitialTrigger) {
          return [newNode];
        }

        return [...nodes, newNode];
      });

      if (!options?.keepPanelOpen) {
        setIsOpen(false);
        setSearchTerm("");
      }
    },
    [canAddManualTrigger, screenToFlowPosition, setNodes, setIsOpen],
  );

  const getCanvasDropInfo = useCallback(
    (clientX: number, clientY: number) => {
      const pane = document.querySelector(".react-flow__pane");
      if (!pane) {
        return { overCanvas: false } as const;
      }

      const rect = pane.getBoundingClientRect();
      const overCanvas =
        clientX >= rect.left &&
        clientX <= rect.right &&
        clientY >= rect.top &&
        clientY <= rect.bottom;

      if (!overCanvas) {
        return { overCanvas: false } as const;
      }

      const position = screenToFlowPosition({ x: clientX, y: clientY });
      return { overCanvas: true, position } as const;
    },
    [screenToFlowPosition],
  );

  const removeDragListeners = useCallback(() => {
    if (dragListenersRef.current.move) {
      window.removeEventListener("pointermove", dragListenersRef.current.move);
    }
    if (dragListenersRef.current.up) {
      window.removeEventListener("pointerup", dragListenersRef.current.up);
    }
    dragListenersRef.current = {};
  }, []);

  const handleDragPointerDown = useCallback(
    (
      event: React.PointerEvent<HTMLButtonElement>,
      nodeType: NodeTypeOption,
    ) => {
      if (event.button !== 0) {
        return;
      }

      dragMetaRef.current = {
        node: nodeType,
        startX: event.clientX,
        startY: event.clientY,
        isDragging: false,
      };

      const handlePointerMove = (moveEvent: PointerEvent) => {
        const dragMeta = dragMetaRef.current;
        if (!dragMeta) {
          return;
        }

        const distance = Math.hypot(
          moveEvent.clientX - dragMeta.startX,
          moveEvent.clientY - dragMeta.startY,
        );

        if (!dragMeta.isDragging && distance > 6) {
          dragMeta.isDragging = true;
        }

        if (!dragMeta.isDragging) {
          return;
        }

        const canvasInfo = getCanvasDropInfo(
          moveEvent.clientX,
          moveEvent.clientY,
        );
        setDragPreview({
          node: dragMeta.node,
          x: moveEvent.clientX,
          y: moveEvent.clientY,
          overCanvas: canvasInfo.overCanvas,
        });
      };

      const handlePointerUp = (upEvent: PointerEvent) => {
        const dragMeta = dragMetaRef.current;
        dragMetaRef.current = null;
        removeDragListeners();

        if (!dragMeta) {
          setDragPreview(null);
          return;
        }

        if (!dragMeta.isDragging) {
          setDragPreview(null);
          return;
        }

        // Mark that a drag was completed to prevent onClick from also firing
        dragCompletedRef.current = true;
        // Reset the flag after a microtask to allow onClick to check it
        requestAnimationFrame(() => {
          dragCompletedRef.current = false;
        });

        const canvasInfo = getCanvasDropInfo(upEvent.clientX, upEvent.clientY);
        if (canvasInfo.overCanvas && canvasInfo.position) {
          addNodeToCanvas(dragMeta.node, {
            position: canvasInfo.position,
            keepPanelOpen: true,
          });
        }
        setDragPreview(null);
      };

      dragListenersRef.current = {
        move: handlePointerMove,
        up: handlePointerUp,
      };

      window.addEventListener("pointermove", handlePointerMove);
      window.addEventListener("pointerup", handlePointerUp);
    },
    [addNodeToCanvas, getCanvasDropInfo, removeDragListeners],
  );

  useEffect(() => {
    return () => {
      removeDragListeners();
      dragMetaRef.current = null;
    };
  }, [removeDragListeners]);

  // Click handler that prevents double-add when drag just completed
  const handleNodeClick = useCallback(
    (nodeType: NodeTypeOption) => {
      // If a drag operation just completed, skip the click
      if (dragCompletedRef.current) {
        return;
      }
      addNodeToCanvas(nodeType);
    },
    [addNodeToCanvas],
  );

  useEffect(() => {
    const pane = document.querySelector(".react-flow__pane");
    if (!pane) {
      return;
    }

    if (dragPreview?.overCanvas) {
      pane.classList.add("canvas-drop-active");
    } else {
      pane.classList.remove("canvas-drop-active");
    }

    return () => {
      pane.classList.remove("canvas-drop-active");
    };
  }, [dragPreview]);

  const dragPreviewPortal =
    dragPreview && typeof window !== "undefined"
      ? createPortal(
          ((preview) => {
            const PreviewIcon = preview.node.icon;
            return (
              <div
                className="pointer-events-none fixed z-60"
                style={{
                  left: preview.x + 12,
                  top: preview.y + 12,
                }}
              >
                <div className="flex items-center gap-2 rounded-xl border border-dashed border-primary bg-background px-3 py-2 shadow-xl dark:bg-card">
                  {typeof PreviewIcon === "string" ? (
                    <Image
                      src={PreviewIcon}
                      alt={preview.node.label}
                      width={20}
                      height={20}
                    />
                  ) : (
                    <PreviewIcon className="size-4 text-muted-foreground" />
                  )}
                  <span className="text-sm font-semibold text-foreground">
                    {preview.node.label}
                  </span>
                </div>
              </div>
            );
          })(dragPreview),
          document.body,
        )
      : null;

  return (
    <>
      {/* Add Node FAB (plus rotates to X) */}
      <button
        type="button"
        onClick={() => setIsOpen((v) => !v)}
        aria-label={isOpen ? "Close add node panel" : "Open add node panel"}
        className="absolute bottom-4 right-4 z-20 size-14 rounded-full bg-background border-2 border-border shadow-lg hover:border-primary transition-colors dark:bg-card dark:hover:shadow-[0_0_20px_rgba(0,33,243,0.3)]"
      >
        <Plus
          className={
            "mx-auto size-8 text-muted-foreground transition-transform duration-200 " +
            (isOpen ? "rotate-45" : "rotate-0")
          }
        />
      </button>

      {/* Integrations Panel - Cyber-Tech styled */}
      <div
        className={
          "absolute z-10 w-[340px] h-[480px] bg-background border border-border rounded-3xl shadow-lg overflow-hidden flex flex-col bottom-20 right-4 transition-all duration-200 dark:bg-card dark:border-border " +
          (isOpen
            ? "opacity-100 translate-y-0 pointer-events-auto"
            : "opacity-0 translate-y-2 pointer-events-none")
        }
      >
        {/* Header with Title */}
        <div className="px-4 py-3 border-b border-border">
          <h3 className="font-semibold text-md text-foreground">Add Node</h3>
        </div>

        {/* Node List - scrollable */}
        <div className="flex-1 overflow-y-auto px-3 pb-3 category-dropdown-scroll">
          {filteredSections.length === 0 ? (
            <div className="px-3 py-6 text-center text-sm text-muted-foreground">
              No nodes match your search
            </div>
          ) : (
            filteredSections.map((group, index) => (
              <div
                key={group.title}
                className={`mb-4 ${index === 0 ? "mt-0" : "mt-2"}`}
              >
                <SectionHeader title={group.title} icon={group.icon} />
                {group.nodes.map((nodeType, nodeIndex) => (
                  <NodeItem
                    key={`${group.title}-${nodeType.type ?? nodeType.label}-${nodeIndex}`}
                    nodeType={nodeType}
                    onClick={() => handleNodeClick(nodeType)}
                    onPointerDown={(event) =>
                      handleDragPointerDown(event, nodeType)
                    }
                  />
                ))}
              </div>
            ))
          )}
        </div>

        {/* Category Filter Pills */}
        <div className="flex gap-1.5 px-3 py-2 border-t border-border overflow-x-auto category-dropdown-scroll">
          <button
            type="button"
            onClick={() => setActiveFilter("all")}
            className={
              "px-2.5 py-1 text-xs font-medium rounded-full whitespace-nowrap transition-colors " +
              (activeFilter === "all"
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-accent hover:text-accent-foreground")
            }
          >
            All
          </button>
          {nodeSections.map((section) => {
            const Icon = section.icon;
            return (
              <button
                key={section.id}
                type="button"
                onClick={() => setActiveFilter(section.id)}
                className={
                  "flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-full whitespace-nowrap transition-colors " +
                  (activeFilter === section.id
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-accent hover:text-accent-foreground")
                }
              >
                <Icon className="size-3" />
                {section.title}
              </button>
            );
          })}
        </div>

        {/* Footer with Search */}
        <div className="px-4 py-3 border-t border-border">
          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search nodes..."
              className="h-9 pl-9 text-sm rounded-lg border-border bg-background focus-visible:ring-primary dark:bg-secondary"
            />
          </div>
        </div>
      </div>
      {dragPreviewPortal}
    </>
  );
});
