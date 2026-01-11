"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from "react";
import type { NodeStatus } from "@/components/react-flow/node-status-indicator";

type NodeStatusMap = Map<string, NodeStatus>;

interface ExecutionFlowContextValue {
  /** Map of node ID to its current execution status */
  nodeStatuses: NodeStatusMap;
  /** Update the status of a specific node */
  setNodeStatus: (nodeId: string, status: NodeStatus) => void;
  /** Clear all node statuses (reset to initial) */
  clearAllStatuses: () => void;
  /** Check if any node is currently running/loading */
  isAnyNodeRunning: boolean;
  /** Check if a specific node is running */
  isNodeRunning: (nodeId: string) => boolean;
  /** Get nodes that are sources of running nodes (for edge animation) */
  getRunningEdges: () => Set<string>;
}

const ExecutionFlowContext = createContext<ExecutionFlowContextValue | null>(null);

export function ExecutionFlowProvider({ children }: { children: ReactNode }) {
  const [nodeStatuses, setNodeStatuses] = useState<NodeStatusMap>(new Map());

  const setNodeStatus = useCallback((nodeId: string, status: NodeStatus) => {
    setNodeStatuses((prev) => {
      const newMap = new Map(prev);
      newMap.set(nodeId, status);
      return newMap;
    });
  }, []);

  const clearAllStatuses = useCallback(() => {
    setNodeStatuses(new Map());
  }, []);

  const isAnyNodeRunning = Array.from(nodeStatuses.values()).some(
    (status) => status === "loading"
  );

  const isNodeRunning = useCallback(
    (nodeId: string) => nodeStatuses.get(nodeId) === "loading",
    [nodeStatuses]
  );

  const getRunningEdges = useCallback(() => {
    const runningNodeIds = new Set<string>();
    nodeStatuses.forEach((status, nodeId) => {
      if (status === "loading") {
        runningNodeIds.add(nodeId);
      }
    });
    return runningNodeIds;
  }, [nodeStatuses]);

  return (
    <ExecutionFlowContext.Provider
      value={{
        nodeStatuses,
        setNodeStatus,
        clearAllStatuses,
        isAnyNodeRunning,
        isNodeRunning,
        getRunningEdges,
      }}
    >
      {children}
    </ExecutionFlowContext.Provider>
  );
}

export function useExecutionFlow() {
  const context = useContext(ExecutionFlowContext);
  if (!context) {
    throw new Error("useExecutionFlow must be used within an ExecutionFlowProvider");
  }
  return context;
}

/**
 * Hook to get whether an edge should be animated based on connected node statuses
 * An edge is animated when its source node is running OR when either connected node is running
 */
export function useEdgeAnimation(sourceNodeId: string, targetNodeId: string) {
  const context = useContext(ExecutionFlowContext);
  
  if (!context) {
    return { isAnimated: false, flowSpeed: "normal" as const };
  }

  const sourceStatus = context.nodeStatuses.get(sourceNodeId);
  const targetStatus = context.nodeStatuses.get(targetNodeId);

  // Animate if source is running (data is flowing out)
  // or if target is running (data is flowing in)
  const isAnimated = sourceStatus === "loading" || targetStatus === "loading";

  // Faster animation when source is actively sending
  const flowSpeed = sourceStatus === "loading" ? "fast" : "normal";

  return { isAnimated, flowSpeed };
}
