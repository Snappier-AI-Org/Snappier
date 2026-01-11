"use client";

import type { Edge, Node } from "@xyflow/react";
import { MessageCircle, X } from "lucide-react";
import { memo, useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { ChatPanel } from "./chat-panel";
import { WorkflowSummary } from "./workflow-summary";

const WIDTH_BOUNDS = { min: 540, max: 960 } as const;
const HEIGHT_BOUNDS = { min: 280, max: 640 } as const;
const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

interface ChatSummaryPanelProps {
  nodes: Node[];
  edges: Edge[];
}

export const ChatSummaryPanel = memo(function ChatSummaryPanel({
  nodes,
  edges,
}: ChatSummaryPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"chat" | "summary">("chat");
  const [dimensions, setDimensions] = useState({ width: 640, height: 320 });
  const resizeListenersRef = useRef<{
    move?: (event: PointerEvent) => void;
    up?: (event: PointerEvent) => void;
  }>({});

  const handleEdgeResize = useCallback(
    (
      event: React.PointerEvent<HTMLDivElement>,
      direction: "width" | "height",
    ) => {
      event.preventDefault();
      event.stopPropagation();

      const startX = event.clientX;
      const startY = event.clientY;
      const startingWidth = dimensions.width;
      const startingHeight = dimensions.height;

      const onPointerMove = (moveEvent: PointerEvent) => {
        moveEvent.preventDefault();
        const deltaX = moveEvent.clientX - startX;
        const deltaY = moveEvent.clientY - startY;

        setDimensions((current) => {
          if (direction === "width") {
            const nextWidth = clamp(
              startingWidth + deltaX,
              WIDTH_BOUNDS.min,
              WIDTH_BOUNDS.max,
            );
            if (nextWidth === current.width) return current;
            return { ...current, width: nextWidth };
          }

          const nextHeight = clamp(
            startingHeight - deltaY,
            HEIGHT_BOUNDS.min,
            HEIGHT_BOUNDS.max,
          );
          if (nextHeight === current.height) return current;
          return { ...current, height: nextHeight };
        });
      };

      const onPointerUp = () => {
        window.removeEventListener("pointermove", onPointerMove);
        window.removeEventListener("pointerup", onPointerUp);
        resizeListenersRef.current = {};
      };

      window.addEventListener("pointermove", onPointerMove);
      window.addEventListener("pointerup", onPointerUp);
      resizeListenersRef.current = { move: onPointerMove, up: onPointerUp };
    },
    [dimensions],
  );

  useEffect(() => {
    return () => {
      if (resizeListenersRef.current.move) {
        window.removeEventListener(
          "pointermove",
          resizeListenersRef.current.move,
        );
      }
      if (resizeListenersRef.current.up) {
        window.removeEventListener("pointerup", resizeListenersRef.current.up);
      }
    };
  }, []);

  return (
    <div className="absolute bottom-6 left-24 z-20 flex items-end gap-3 pointer-events-none">
      {/* Floating toggle button - X button with cyber blue */}
      <Button
        size="icon"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "pointer-events-auto left-20 size-14 rounded-full shadow-lg transition-all duration-200",
          isOpen
            ? "bg-primary hover:bg-primary/90 text-primary-foreground dark:shadow-[0_0_20px_rgba(0,33,243,0.4)]"
            : "bg-background border-2 border-border hover:border-primary text-muted-foreground dark:bg-card",
        )}
        aria-label={isOpen ? "Close chat panel" : "Open chat panel"}
      >
        {isOpen ? (
          <X className="size-6" />
        ) : (
          <MessageCircle className="size-6" />
        )}
      </Button>

      {/* Floating panel - Cyber-Tech styled */}
      <div
        className={cn(
          "relative z-10 bg-background border-2 border-primary rounded-[22px] shadow-xl transition-all duration-300 ease-in-out overflow-hidden flex flex-col pointer-events-auto dark:bg-card dark:shadow-[0_0_30px_rgba(0,33,243,0.2)]",
          isOpen
            ? "opacity-100 translate-y-0"
            : "opacity-0 translate-y-4 pointer-events-none",
        )}
        style={{
          width: `${dimensions.width}px`,
          height: `${dimensions.height}px`,
        }}
      >
        <Tabs
          value={activeTab}
          onValueChange={(v) => setActiveTab(v as "chat" | "summary")}
          className="flex flex-col h-full"
        >
          {/* Header with Chat title and Session ID */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
            <TabsList className="h-auto p-0 bg-transparent gap-4">
              <TabsTrigger
                value="chat"
                className="px-0 py-0 h-auto text-base font-semibold data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=inactive]:text-muted-foreground data-[state=active]:shadow-none"
              >
                Chat Assistant
              </TabsTrigger>
              <TabsTrigger
                value="summary"
                className="px-0 py-0 h-auto text-base font-semibold data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=inactive]:text-muted-foreground data-[state=active]:shadow-none"
              >
                Workflow Summary
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Content */}
          <TabsContent value="chat" className="flex-1 m-0 overflow-hidden">
            <ChatPanel />
          </TabsContent>

          <TabsContent value="summary" className="flex-1 m-0 overflow-hidden">
            <WorkflowSummary nodes={nodes} edges={edges} />
          </TabsContent>
        </Tabs>

        {/* Edge resize handles */}
        <div
          className="group absolute top-0 left-0 right-0 h-3 cursor-n-resize"
          onPointerDown={(event) => handleEdgeResize(event, "height")}
        >
          <span className="sr-only">Resize height</span>
          <div className="mx-auto mt-1 h-[2px] w-20 rounded-full bg-border opacity-0 transition-opacity duration-150 group-hover:opacity-70" />
        </div>
        <div
          className="group absolute top-0 right-0 bottom-0 w-3 cursor-e-resize"
          onPointerDown={(event) => handleEdgeResize(event, "width")}
        >
          <span className="sr-only">Resize width</span>
          <div className="absolute top-1/2 right-1 h-20 -translate-y-1/2 w-[2px] rounded-full bg-border opacity-0 transition-opacity duration-150 group-hover:opacity-70" />
        </div>
      </div>
    </div>
  );
});
