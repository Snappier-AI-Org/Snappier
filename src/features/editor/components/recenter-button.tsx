"use client";

import { useReactFlow } from "@xyflow/react";
import { LocateFixed } from "lucide-react";
import { useCallback } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { NodeType } from "@/generated/prisma";

const triggerNodeTypes: NodeType[] = [
  NodeType.MANUAL_TRIGGER,
  NodeType.GOOGLE_FORM_TRIGGER,
  NodeType.STRIPE_TRIGGER,
  NodeType.GMAIL_TRIGGER,
  NodeType.SCHEDULE_TRIGGER,
  NodeType.WEBHOOK_TRIGGER,
  NodeType.INITIAL,
];

export const RecenterButton = () => {
  const { getNodes, setCenter, getViewport } = useReactFlow();

  const handleRecenter = useCallback(() => {
    const nodes = getNodes();

    if (!nodes.length) {
      toast.info("Add a node to recenter the canvas.");
      return;
    }

    const triggerNode = nodes.find((node) =>
      node.type ? triggerNodeTypes.includes(node.type as NodeType) : false,
    );
    const targetNode = triggerNode ?? nodes[0];

    if (!targetNode) {
      toast.info("No nodes available to focus.");
      return;
    }

    const { position, width, height } = targetNode;

    const centerX =
      typeof width === "number" ? position.x + width / 2 : position.x;
    const centerY =
      typeof height === "number" ? position.y + height / 2 : position.y;

    const currentZoom = getViewport().zoom ?? 1;

    setCenter(centerX, centerY, {
      duration: 500,
      zoom: currentZoom,
    });
  }, [getNodes, getViewport, setCenter]);

  return (
    <Button
      size="sm"
      type="button"
      onClick={handleRecenter}
      className="gap-2 bg-background text-foreground border border-border hover:border-primary hover:bg-primary/5 shadow-md text-xs font-semibold dark:bg-card dark:hover:bg-primary/10"
    >
      <LocateFixed className="size-4 text-primary" />
      Recenter
    </Button>
  );
};
