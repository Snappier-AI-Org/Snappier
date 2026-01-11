"use client";

import { createContext, useContext } from "react";

const WorkflowContext = createContext<{ workflowId: string } | null>(null);

export const WorkflowProvider = ({
  workflowId,
  children,
}: {
  workflowId: string;
  children: React.ReactNode;
}) => {
  return (
    <WorkflowContext.Provider value={{ workflowId }}>
      {children}
    </WorkflowContext.Provider>
  );
};

export const useWorkflowId = () => {
  const context = useContext(WorkflowContext);
  if (!context) {
    throw new Error("useWorkflowId must be used within WorkflowProvider");
  }
  return context.workflowId;
};

