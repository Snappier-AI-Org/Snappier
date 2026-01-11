"use client";

import { useReactFlow, type Node, type NodeProps } from "@xyflow/react";
import { memo, useState } from "react";
import { BaseExecutionNode } from "../base-execution-node";
import { useNodeStatus } from "../../hooks/use-node-status";
import { fetchGithubRealtimeToken } from "./actions";
import { GITHUB_CHANNEL_NAME } from "@/inngest/channels/github";
import { GithubDialog, type GithubFormValues } from "./dialog";
import { useWorkflowId } from "@/features/editor/context/workflow-context";
import { useLatestExecution } from "@/features/executions/hooks/use-executions";
import { parseError } from "@/features/executions/lib/error-parser";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useWorkflowVariables } from "@/features/editor/hooks/use-workflow-variables";

type GithubNodeData = {
  credentialId?: string;
  operation?:
    | "list_repos"
    | "get_repo"
    | "list_issues"
    | "get_issue"
    | "create_issue"
    | "update_issue"
    | "close_issue"
    | "list_pull_requests"
    | "get_pull_request"
    | "create_pull_request"
    | "merge_pull_request"
    | "list_branches"
    | "get_file_content"
    | "create_or_update_file";
  owner?: string;
  repo?: string;
  issueNumber?: string;
  title?: string;
  body?: string;
  labels?: { name: string }[];
  assignees?: string;
  state?: "open" | "closed" | "all";
  prNumber?: string;
  head?: string;
  base?: string;
  draft?: boolean;
  path?: string;
  branch?: string;
  content?: string;
  message?: string;
  sha?: string;
  variableName?: string;
};

type GithubNodeType = Node<GithubNodeData>;

const OPERATION_LABELS: Record<string, string> = {
  list_repos: "List Repositories",
  get_repo: "Get Repository",
  list_issues: "List Issues",
  get_issue: "Get Issue",
  create_issue: "Create Issue",
  update_issue: "Update Issue",
  close_issue: "Close Issue",
  list_pull_requests: "List Pull Requests",
  get_pull_request: "Get Pull Request",
  create_pull_request: "Create Pull Request",
  merge_pull_request: "Merge Pull Request",
  list_branches: "List Branches",
  get_file_content: "Get File Content",
  create_or_update_file: "Create/Update File",
};

export const GithubNode = memo((props: NodeProps<GithubNodeType>) => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const { setNodes } = useReactFlow();
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
    channel: GITHUB_CHANNEL_NAME,
    topic: "status",
    refreshToken: fetchGithubRealtimeToken,
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

  const handleSubmit = (values: GithubFormValues) => {
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

  const nodeData = props.data;
  
  // Build description based on operation
  let description = "Not configured";
  if (nodeData?.operation) {
    const opLabel = OPERATION_LABELS[nodeData.operation] || nodeData.operation;
    if (nodeData.owner && nodeData.repo) {
      description = `${opLabel}: ${nodeData.owner}/${nodeData.repo}`;
    } else if (nodeData.operation === "list_repos") {
      description = opLabel;
    } else {
      description = `${opLabel} (incomplete)`;
    }
  }

  // Show error tooltip if there's an error
  const nodeElement = (
    <BaseExecutionNode
      {...props}
      id={props.id}
      icon="/logos/github.svg"
      name="GitHub"
      description={description}
      status={nodeStatus}
      onSettings={handleOpenSettings}
      onDoubleClick={handleOpenSettings}
    />
  );

  return (
    <>
      <GithubDialog
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

GithubNode.displayName = "GithubNode";
