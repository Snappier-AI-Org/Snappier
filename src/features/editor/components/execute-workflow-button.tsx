"use client";

import { Button } from "@/components/ui/button";
import { useExecuteWorkflow } from "@/features/workflows/hooks/use-workflows";
import { FlaskConicalIcon, Loader2Icon } from "lucide-react";
import { memo, useCallback } from "react";
import { useAtomValue } from "jotai";
import { editorAtom } from "../store/atoms";
import { detectCycle } from "../utils/cycle-detection";
import { toast } from "sonner";

export const ExecuteWorkflowButton = memo(({
  workflowId,
}: {
  workflowId: string;
}) => {
  const executeWorkflow = useExecuteWorkflow();
  const editor = useAtomValue(editorAtom);

  const handleExecute = useCallback(() => {
    if (!editor) {
      toast.error("Editor not initialized. Please wait a moment and try again.");
      return;
    }

    const nodes = editor.getNodes();
    const edges = editor.getEdges();

    // Check for cycles before executing
    const { hasCycle, cyclePath } = detectCycle(nodes, edges);
    
    if (hasCycle) {
      toast.error(
        "Workflow contains a cycle. Please remove circular connections before executing.",
        {
          description: cyclePath && cyclePath.length > 0
            ? `Cycle detected: ${cyclePath.join(" → ")}`
            : "Nodes are connected in a loop, which prevents execution.",
          duration: 5000,
        }
      );
      return;
    }

    // Execute directly - auto-save should already have saved any changes
    executeWorkflow.mutate({ id: workflowId });
  }, [workflowId, executeWorkflow, editor]);

  const isProcessing = executeWorkflow.isPending;

  return (
    <Button size="lg" onClick={handleExecute} disabled={isProcessing}>
      {isProcessing ? (
        <>
          <Loader2Icon className="size-4 animate-spin mr-2" />
          Executing...
        </>
      ) : (
        <>
          <FlaskConicalIcon className="size-4 mr-2" />
          Execute workflow
        </>
      )}
    </Button>
  );
});

ExecuteWorkflowButton.displayName = "ExecuteWorkflowButton";