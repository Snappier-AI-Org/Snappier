"use client";

import { useEffect, useMemo } from "react";
import { useReactFlow, type Edge } from "@xyflow/react";
import { useLatestExecution } from "@/features/executions/hooks/use-executions";
import { ExecutionStatus } from "@/generated/prisma";
import type { AnimatedEdgeData } from "@/components/react-flow/animated-edge";

interface UseAnimatedEdgesOptions {
  workflowId: string | undefined;
  edges: Edge[];
}

interface NodeExecutionInfo {
  nodeId: string;
  status: "loading" | "success" | "error" | "initial";
}

/**
 * Hook to animate edges based on workflow execution status
 * When a workflow is running, edges connected to running nodes will be animated
 */
export function useAnimatedEdges({ workflowId, edges }: UseAnimatedEdgesOptions) {
  const { setEdges } = useReactFlow();
  const { data: latestExecution } = useLatestExecution(workflowId);

  const isWorkflowRunning = latestExecution?.status === ExecutionStatus.RUNNING;

  // Update edges to be animated when workflow is running
  useEffect(() => {
    if (!workflowId) return;

    setEdges((currentEdges) => {
      return currentEdges.map((edge) => {
        const edgeData = (edge.data || {}) as AnimatedEdgeData;
        
        return {
          ...edge,
          data: {
            ...edgeData,
            animated: isWorkflowRunning,
            flowSpeed: isWorkflowRunning ? "normal" : "slow",
          },
        };
      });
    });
  }, [isWorkflowRunning, setEdges, workflowId]);

  return {
    isWorkflowRunning,
    latestExecution,
  };
}

/**
 * Hook to get animated edges based on which specific nodes are running
 * More granular than useAnimatedEdges - only animates edges connected to running nodes
 */
export function useNodeBasedEdgeAnimation(
  edges: Edge[],
  runningNodeIds: Set<string>
): Edge[] {
  return useMemo(() => {
    if (runningNodeIds.size === 0) {
      // No nodes running, return edges without animation
      return edges.map((edge) => ({
        ...edge,
        data: {
          ...(edge.data || {}),
          animated: false,
        },
      }));
    }

    return edges.map((edge) => {
      const sourceRunning = runningNodeIds.has(edge.source);
      const targetRunning = runningNodeIds.has(edge.target);
      const isAnimated = sourceRunning || targetRunning;

      return {
        ...edge,
        data: {
          ...(edge.data || {}),
          animated: isAnimated,
          flowSpeed: sourceRunning ? "fast" : "normal",
          flowDirection: "forward" as const,
        },
      };
    });
  }, [edges, runningNodeIds]);
}
