"use client";

import { useReactFlow, type Node, type NodeProps, Position } from "@xyflow/react";
import { memo, useState } from "react";
import { useNodeStatus } from "../../hooks/use-node-status";
import { fetchFilterConditionalRealtimeToken } from "./actions";
import { FILTER_CONDITIONAL_CHANNEL_NAME } from "@/inngest/channels/filter-conditional";
import { FilterConditionalDialog, type FilterConditionalFormValues } from "./dialog";
import { useWorkflowId } from "@/features/editor/context/workflow-context";
import { useLatestExecution } from "@/features/executions/hooks/use-executions";
import { parseError } from "@/features/executions/lib/error-parser";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useWorkflowVariables } from "@/features/editor/hooks/use-workflow-variables";
import { BaseNode, BaseNodeContent } from "@/components/react-flow/base-node";
import { BaseHandle } from "@/components/react-flow/base-handle";
import { WorkflowNode } from "@/components/workflow-node";
import { NodeStatusIndicator } from "@/components/react-flow/node-status-indicator";
import { GitBranch } from "lucide-react";

type Operator =
  | "equals"
  | "not_equals"
  | "contains"
  | "not_contains"
  | "starts_with"
  | "ends_with"
  | "greater_than"
  | "less_than"
  | "greater_than_or_equals"
  | "less_than_or_equals"
  | "is_empty"
  | "is_not_empty"
  | "is_true"
  | "is_false"
  | "regex_match";

type Condition = {
  field: string;
  operator: Operator;
  value?: string;
};

type FilterConditionalNodeData = {
  variableName?: string;
  conditions?: Condition[];
  logicalOperator?: "AND" | "OR";
};

type FilterConditionalNodeType = Node<FilterConditionalNodeData>;

const OPERATOR_LABELS: Record<string, string> = {
  equals: "=",
  not_equals: "≠",
  contains: "contains",
  not_contains: "!contains",
  starts_with: "starts with",
  ends_with: "ends with",
  greater_than: ">",
  less_than: "<",
  greater_than_or_equals: "≥",
  less_than_or_equals: "≤",
  is_empty: "is empty",
  is_not_empty: "is not empty",
  is_true: "is true",
  is_false: "is false",
  regex_match: "matches",
};

export const FilterConditionalNode = memo((props: NodeProps<FilterConditionalNodeType>) => {
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
    channel: FILTER_CONDITIONAL_CHANNEL_NAME,
    topic: "status",
    refreshToken: fetchFilterConditionalRealtimeToken,
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

  const handleSubmit = (values: FilterConditionalFormValues) => {
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

  // Build description based on conditions
  let description = "Not configured";
  if (nodeData?.conditions && nodeData.conditions.length > 0) {
    const firstCondition = nodeData.conditions[0];
    const opLabel = OPERATOR_LABELS[firstCondition.operator] || firstCondition.operator;
    
    if (nodeData.conditions.length === 1) {
      description = `${firstCondition.field} ${opLabel} ${firstCondition.value || ""}`.trim();
    } else {
      description = `${nodeData.conditions.length} conditions (${nodeData.logicalOperator || "AND"})`;
    }
  }

  // Custom node with dual output handles for branching
  const nodeElement = (
    <WorkflowNode
      name="Filter / Conditional"
      description={description}
      onDelete={handleDelete}
      onSettings={handleOpenSettings}
    >
      <NodeStatusIndicator status={nodeStatus} variant="border">
        <BaseNode status={nodeStatus} onDoubleClick={handleOpenSettings}>
          <BaseNodeContent>
            <GitBranch className="size-4 text-muted-foreground" />
            
            {/* Input Handle (Left) */}
            <BaseHandle
              id="target-1"
              type="target"
              position={Position.Left}
            />

            {/* True Output Handle (Right - Top) */}
            <BaseHandle
              id="source-true"
              type="source"
              position={Position.Right}
              style={{ top: "30%" }}
              className="bg-green-500! border-green-600! dark:bg-green-600! dark:border-green-500!"
            />

            {/* False Output Handle (Right - Bottom) */}
            <BaseHandle
              id="source-false"
              type="source"
              position={Position.Right}
              style={{ top: "70%" }}
              className="bg-red-500! border-red-600! dark:bg-red-600! dark:border-red-500!"
            />
          </BaseNodeContent>
        </BaseNode>
      </NodeStatusIndicator>
    </WorkflowNode>
  );

  return (
    <>
      <FilterConditionalDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSubmit={handleSubmit}
        defaultValues={nodeData}
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

FilterConditionalNode.displayName = "FilterConditionalNode";
