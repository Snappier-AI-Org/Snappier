import type { EdgeTypes } from "@xyflow/react";
import { AnimatedEdge } from "@/components/react-flow/animated-edge";

/**
 * Custom edge types for the workflow editor
 * 
 * - default: Standard bezier edge with subtle styling
 * - animated: Edge with flowing particle animation for running executions
 */
export const edgeTypes: EdgeTypes = {
  default: AnimatedEdge,
  animated: AnimatedEdge,
};

export type RegisteredEdgeType = keyof typeof edgeTypes;
