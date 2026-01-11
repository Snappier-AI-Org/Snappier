"use client";

import { useReactFlow, type Node, type NodeProps } from "@xyflow/react";
import { memo, useState, useEffect, useRef } from "react";
import { BaseExecutionNode } from "../base-execution-node";
import { useNodeStatus } from "../../hooks/use-node-status";
import { fetchTelegramRealtimeToken } from "./actions";
import { TELEGRAM_CHANNEL_NAME } from "@/inngest/channels/telegram";
import { TelegramDialog, TelegramFormValues } from "./dialog";
import { useWorkflowId } from "@/features/editor/context/workflow-context";
import { useLatestExecution } from "@/features/executions/hooks/use-executions";
import { parseError } from "@/features/executions/lib/error-parser";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useWorkflowVariables } from "@/features/editor/hooks/use-workflow-variables";


type TelegramNodeData = {
    botToken?: string;
    chatId?: string;
    content?: string;
    parseMode?: "HTML" | "Markdown" | "MarkdownV2" | "None";
    variableName?: string;
};

type TelegramNodeType = Node<TelegramNodeData>;

export const TelegramNode = memo((props: NodeProps<TelegramNodeType>) => {
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
        channel: TELEGRAM_CHANNEL_NAME,
        topic: "status",
        refreshToken: fetchTelegramRealtimeToken,
    });
    
    // Track previous execution to log when it changes
    const previousExecutionIdRef = useRef<string | null>(null);
    const previousStatusRef = useRef<string | null>(null);
    
    // Log execution details in browser console when execution completes
    useEffect(() => {
      if (!latestExecution) return;
      
      const executionId = latestExecution.id;
      const executionStatus = latestExecution.status;
      
      // Log when execution status changes
      if (previousStatusRef.current !== executionStatus) {
        console.log(`[Telegram Node ${props.id}] Execution status changed:`, {
          nodeId: props.id,
          executionId,
          previousStatus: previousStatusRef.current,
          newStatus: executionStatus,
          execution: {
            id: latestExecution.id,
            status: latestExecution.status,
            error: latestExecution.error,
            output: latestExecution.output,
            startedAt: latestExecution.startedAt,
            completedAt: latestExecution.completedAt,
          }
        });
        previousStatusRef.current = executionStatus;
      }
      
      // Log detailed execution info when a new execution completes
      if (executionId !== previousExecutionIdRef.current && executionStatus === "SUCCESS") {
        console.log(`[Telegram Node ${props.id}] ✅ Execution completed successfully!`, {
          nodeId: props.id,
          executionId,
          nodeData: props.data,
          executionOutput: latestExecution.output,
          executionContext: latestExecution.output ? Object.keys(latestExecution.output) : [],
          fullExecution: latestExecution
        });
        
        // If output contains our variable, log the Telegram response details
        if (latestExecution.output && props.data?.variableName && typeof latestExecution.output === 'object' && latestExecution.output !== null) {
          const output = latestExecution.output as Record<string, unknown>;
          const variableData = output[props.data.variableName] as { messageId?: number; messageContent?: string } | undefined;
          if (variableData) {
            console.log(`[Telegram Node ${props.id}] 📨 Telegram message details:`, {
              variableName: props.data.variableName,
              messageId: variableData.messageId,
              messageContent: variableData.messageContent,
              fullVariableData: variableData
            });
          }
        }
        
        previousExecutionIdRef.current = executionId;
      }
      
      // Log errors
      if (executionStatus === "FAILED" && latestExecution.error) {
        console.error(`[Telegram Node ${props.id}] ❌ Execution failed:`, {
          nodeId: props.id,
          executionId,
          error: latestExecution.error,
          errorStack: latestExecution.errorStack,
          nodeData: props.data
        });
      }
    }, [latestExecution, props.id, props.data]);
    
    // Log status changes
    if (nodeStatus === "error") {
      console.log(`[Telegram Node ${props.id}] Node status is error`, {
        nodeId: props.id,
        latestExecution: latestExecution ? {
          id: latestExecution.id,
          status: latestExecution.status,
          error: latestExecution.error,
          errorStack: latestExecution.errorStack
        } : null
      });
    }
    
    // Log when node status changes to success
    useEffect(() => {
      if (nodeStatus === "success") {
        console.log(`[Telegram Node ${props.id}] ✅ Node status: success`, {
          nodeId: props.id,
          executionId: latestExecution?.id,
          nodeData: props.data
        });
      }
    }, [nodeStatus, props.id, latestExecution?.id, props.data]);
    
    // Get error message if node is in error state and execution has an error
    const parsedError = nodeStatus === "error" && latestExecution?.error
      ? parseError(new Error(latestExecution.error))
      : null;
    
    const errorMessage = parsedError?.message || null;
    const errorGuidance = parsedError?.guidance || null;
    const errorFixSteps = parsedError?.fixSteps || [];
    
    if (errorMessage) {
      console.log(`[Telegram Node ${props.id}] Error message extracted:`, {
        errorMessage,
        errorGuidance,
        errorFixSteps,
        originalError: latestExecution?.error
      });
    }

    const handleOpenSettings = () => setDialogOpen(true);

    const handleSubmit = (values: TelegramFormValues) => {
    setNodes((nodes) => nodes.map((node) => {
        if (node.id === props.id) {
        return {
            ...node,
            data: {
            ...node.data,
            ...values,
            }
        }
    }
        return node;
}));
};

    const nodeData = props.data;
    const description = nodeData?.content
    ? `"Send": ${nodeData.content.slice(0, 50)}...`
    : "Not configured";

    const nodeContent = (
        <BaseExecutionNode
            {...props}
            id={props.id}
            icon="/logos/telegram.svg"
            name="Telegram"
            description={description}
            status={nodeStatus}
            onSettings={handleOpenSettings}
            onDoubleClick={handleOpenSettings}
        />
    );

    return (
        <>  
            <TelegramDialog
                open={dialogOpen}
                onOpenChange={setDialogOpen}
                onSubmit={handleSubmit}
                defaultValues={nodeData}
                workflowVariables={workflowVariables}
                currentNodeId={props.id}
            />

            {errorMessage ? (
                <Tooltip>
                    <TooltipTrigger asChild>
                        {nodeContent}
                    </TooltipTrigger>
                    <TooltipContent className="max-w-md bg-destructive text-destructive-foreground">
                        <div className="space-y-3">
                            <div>
                                <p className="font-semibold mb-1">Error:</p>
                                <p className="text-sm font-medium">{errorMessage}</p>
                            </div>
                            {errorGuidance && (
                                <div>
                                    <p className="text-xs font-semibold opacity-90 mb-1">What went wrong:</p>
                                    <p className="text-xs opacity-90">{errorGuidance}</p>
                                </div>
                            )}
                            {errorFixSteps.length > 0 && (
                                <div className="pt-2 border-t border-white/20">
                                    <p className="text-xs font-semibold opacity-90 mb-2">How to fix:</p>
                                    <ol className="text-xs opacity-90 space-y-1 list-decimal list-inside">
                                        {errorFixSteps.slice(0, 3).map((step, index) => (
                                            <li key={index}>{step}</li>
                                        ))}
                                    </ol>
                                </div>
                            )}
                            {latestExecution?.error && (
                                <div className="pt-2 border-t border-white/20">
                                    <p className="text-xs font-semibold opacity-90 mb-1">Technical Details:</p>
                                    <p className="text-xs opacity-90 wrap-break-word font-mono">
                                        {latestExecution.error.length > 150 
                                            ? latestExecution.error.slice(0, 150) + "..."
                                            : latestExecution.error}
                                    </p>
                                </div>
                            )}
                        </div>
                    </TooltipContent>
                </Tooltip>
            ) : (
                nodeContent
            )}
        </>
    )
});

TelegramNode.displayName = "TelegramNode";

