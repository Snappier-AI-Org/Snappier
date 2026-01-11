"use client";

import { type Node, type ReactFlowState, useStore } from "@xyflow/react";
import { useMemo } from "react";
import {
  getWorkflowVariables,
  type WorkflowVariableGroup,
} from "@/features/editor/lib/workflow-variables";

const selectNodes = (state: ReactFlowState | undefined) => {
  if (!state?.nodes) {
    return [] as Node[];
  }

  return state.nodes as Node[];
};

export const useWorkflowVariables = (): WorkflowVariableGroup[] => {
  const nodes = useStore(selectNodes);

  return useMemo(() => getWorkflowVariables(nodes), [nodes]);
};
