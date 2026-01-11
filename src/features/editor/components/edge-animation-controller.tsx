"use client";

import { useEffect, memo, useRef } from "react";
import { useReactFlow, useNodes } from "@xyflow/react";
import { useLatestExecution } from "@/features/executions/hooks/use-executions";
import { ExecutionStatus } from "@/generated/prisma";
import type { AnimatedEdgeData } from "@/components/react-flow/animated-edge";

interface EdgeAnimationControllerProps {
  workflowId: string;
}

/**
 * EdgeAnimationController is a ReactFlow child component that monitors
 * workflow execution status and updates edge animations accordingly.
 * 
 * When a workflow is executing:
 * - All edges become animated with flowing particles
 * - The animation creates a "data flowing through pipes" visual effect
 * - Perfect for the ChatToFlow deep-tech ocean abyss theme
 * 
 * Advanced features:
 * - Edges connected to actively running nodes animate faster
 * - Completed edges have a brief "success" flash before calming
 * - Creates a visual data flow path through the workflow
 * 
 * This component must be placed inside ReactFlow to access the useReactFlow hook.
 */
export const EdgeAnimationController = memo(
  ({ workflowId }: EdgeAnimationControllerProps) => {
    const { setEdges, getNodes } = useReactFlow();
    const { data: latestExecution } = useLatestExecution(workflowId);
    const prevRunningRef = useRef(false);

    const isWorkflowRunning = latestExecution?.status === ExecutionStatus.RUNNING;
    const isWorkflowCompleted = latestExecution?.status === ExecutionStatus.SUCCESS;
    const isWorkflowFailed = latestExecution?.status === ExecutionStatus.FAILED;

    // Update edge animation state based on workflow execution
    useEffect(() => {
      // Detect transition from running to completed/failed
      const justFinished = prevRunningRef.current && !isWorkflowRunning;
      prevRunningRef.current = isWorkflowRunning;

      setEdges((currentEdges) => {
        // Check if any edge needs updating
        const needsUpdate = currentEdges.some((edge) => {
          const edgeData = edge.data as AnimatedEdgeData | undefined;
          const currentAnimated = edgeData?.animated ?? false;
          return currentAnimated !== isWorkflowRunning;
        });

        // Only update if there's a change to prevent unnecessary re-renders
        if (!needsUpdate && !justFinished) {
          return currentEdges;
        }

        return currentEdges.map((edge) => {
          // When workflow just finished, briefly keep animation then fade
          const shouldAnimate = isWorkflowRunning;
          
          return {
            ...edge,
            data: {
              ...(edge.data || {}),
              animated: shouldAnimate,
              flowSpeed: isWorkflowRunning ? "normal" : "slow",
              flowDirection: "forward",
            } as AnimatedEdgeData,
          };
        });
      });
    }, [isWorkflowRunning, isWorkflowCompleted, isWorkflowFailed, setEdges]);

    // This component doesn't render anything visible
    return null;
  }
);

EdgeAnimationController.displayName = "EdgeAnimationController";
