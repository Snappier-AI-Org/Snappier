"use client";

import { useReactFlow, type Node, type NodeProps, Position } from "@xyflow/react";
import { memo, useState } from "react";
import { useNodeStatus } from "../../hooks/use-node-status";
import { fetchLoopRealtimeToken } from "./actions";
import { LOOP_CHANNEL_NAME } from "@/inngest/channels/loop";
import { LoopDialog, type LoopFormValues } from "./dialog";
import { useWorkflowId } from "@/features/editor/context/workflow-context";
import { useLatestExecution } from "@/features/executions/hooks/use-executions";
import { parseError } from "@/features/executions/lib/error-parser";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useWorkflowVariables } from "@/features/editor/hooks/use-workflow-variables";
import { BaseNode, BaseNodeContent } from "@/components/react-flow/base-node";
import { BaseHandle } from "@/components/react-flow/base-handle";
import { WorkflowNode } from "@/components/workflow-node";
import { NodeStatusIndicator } from "@/components/react-flow/node-status-indicator";
import { Repeat } from "lucide-react";

type LoopMode = "forEach" | "times";

type LoopNodeData = {
  variableName?: string;
  mode?: LoopMode;
  sourceArray?: string;
  iterations?: number;
  maxIterations?: number;
  collectResults?: boolean;
};

type LoopNodeType = Node<LoopNodeData>;

export const LoopNode = memo((props: NodeProps<LoopNodeType>) => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const { setNodes, setEdges } = useReactFlow();
  const workflowVariables = useWorkflowVariables();

  // Get workflowId from context (may not be available in all contexts)
  let workflowId: string | undefined;
  try {
    workflowId = useWorkflowId();
  } catch {
    // Not in workflow context, that's okay
  }

  const { data: latestExecution } = useLatestExecution(workflowId);
  const nodeStatus = useNodeStatus({
    nodeId: props.id,
    channel: LOOP_CHANNEL_NAME,
    topic: "status",
    refreshToken: fetchLoopRealtimeToken,
  });

  // Get error message if node is in error state and execution has an error
  const parsedError =
    nodeStatus === "error" && latestExecution?.error
      ? parseError(new Error(latestExecution.error))
      : null;

  const errorMessage = parsedError?.message || null;
  const errorGuidance = parsedError?.guidance || null;
  const errorFixSteps = parsedError?.fixSteps || [];

  const handleOpenSettings = () => setDialogOpen(true);

  const handleSubmit = (values: LoopFormValues) => {
    setNodes((nodes) =>
      nodes.map((node) => {
        if (node.id === props.id) {
          return {
            ...node,
            data: {
              ...node.data,
              ...values,
            },
          };
        }
        return node;
      })
    );
  };

  const handleDelete = () => {
    setNodes((currentNodes) => {
      const updatedNodes = currentNodes.filter((node) => node.id !== props.id);
      return updatedNodes;
    });
    setEdges((currentEdges) => {
      const updatedEdges = currentEdges.filter(
        (edge) => edge.source !== props.id && edge.target !== props.id
      );
      return updatedEdges;
    });
  };

  const nodeData = props.data;

  // Build description based on loop mode
  let description = "Not configured";
  if (nodeData?.mode === "forEach" && nodeData.sourceArray) {
    const source = nodeData.sourceArray.length > 30 
      ? `${nodeData.sourceArray.substring(0, 30)}...` 
      : nodeData.sourceArray;
    description = `For each: ${source}`;
  } else if (nodeData?.mode === "times" && nodeData.iterations) {
    description = `Repeat ${nodeData.iterations} times`;
  } else if (nodeData?.mode) {
    description = nodeData.mode === "forEach" ? "For each (source not set)" : "Times (count not set)";
  }

  // Standard node with input/output handles
  const nodeElement = (
    <WorkflowNode
      name="Loop"
      description={description}
      onDelete={handleDelete}
      onSettings={handleOpenSettings}
    >
      <NodeStatusIndicator status={nodeStatus} variant="border">
        <BaseNode status={nodeStatus} onDoubleClick={handleOpenSettings}>
          <BaseNodeContent>
            <Repeat className="size-4 text-purple-500" />
            
            {/* Input Handle (Left) */}
            <BaseHandle
              id="target-1"
              type="target"
              position={Position.Left}
            />

            {/* Output Handle (Right) */}
            <BaseHandle
              id="source"
              type="source"
              position={Position.Right}
            />
          </BaseNodeContent>
        </BaseNode>
      </NodeStatusIndicator>
    </WorkflowNode>
  );

  return (
    <>
      <LoopDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSubmit={handleSubmit}
        defaultValues={{
          variableName: nodeData?.variableName || "loop",
          mode: nodeData?.mode || "forEach",
          sourceArray: nodeData?.sourceArray || "",
          iterations: nodeData?.iterations ?? 5,
          maxIterations: nodeData?.maxIterations ?? 1000,
          collectResults: nodeData?.collectResults ?? true,
        }}
        workflowVariables={workflowVariables}
        currentNodeId={props.id}
      />

      {errorMessage ? (
        <Tooltip>
          <TooltipTrigger asChild>{nodeElement}</TooltipTrigger>
          <TooltipContent side="bottom" className="max-w-sm bg-destructive text-destructive-foreground">
            <div className="space-y-1">
              <p className="font-medium">{errorMessage}</p>
              {errorGuidance && (
                <p className="text-xs opacity-90">{errorGuidance}</p>
              )}
              {errorFixSteps.length > 0 && (
                <ul className="text-xs list-disc pl-4 opacity-90">
                  {errorFixSteps.map((step, i) => (
                    <li key={i}>{step}</li>
                  ))}
                </ul>
              )}
            </div>
          </TooltipContent>
        </Tooltip>
      ) : (
        nodeElement
      )}
    </>
  );
});

LoopNode.displayName = "LoopNode";
