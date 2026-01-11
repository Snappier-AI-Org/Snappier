"use client";

import { useMemo } from "react";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sparkles } from "lucide-react";
import { NodeType } from "@/generated/prisma";
import type { Node, Edge } from "@xyflow/react";

// Helper function to get friendly name for node types
function getNodeTypeName(nodeType: NodeType): string {
  const names: Partial<Record<NodeType, string>> = {
    [NodeType.INITIAL]: "Initial",
    [NodeType.MANUAL_TRIGGER]: "Manual Trigger",
    [NodeType.GOOGLE_FORM_TRIGGER]: "Google Form Submission",
    [NodeType.STRIPE_TRIGGER]: "Stripe Event",
    [NodeType.HTTP_REQUEST]: "HTTP Request",
    [NodeType.DISCORD]: "Discord Message",
    [NodeType.SLACK]: "Slack Message",
    [NodeType.TELEGRAM]: "Telegram Message",
    [NodeType.OPENAI]: "OpenAI AI",
    [NodeType.ANTHROPIC]: "Claude AI",
    [NodeType.GEMINI]: "Gemini AI",
    [NodeType.GROQ]: "Groq AI",
    [NodeType.HUGGINGFACE]: "Hugging Face AI",
    [NodeType.GOOGLE_SHEETS]: "Google Sheets",
    [NodeType.GOOGLE_DRIVE]: "Google Drive",
    [NodeType.GMAIL]: "Gmail",
    [NodeType.GOOGLE_CALENDAR]: "Google Calendar",
    [NodeType.GOOGLE_DOCS]: "Google Docs",
    [NodeType.TRELLO]: "Trello",
    [NodeType.FILTER_CONDITIONAL]: "Filter / Conditional",
    [NodeType.DELAY_WAIT]: "Delay / Wait",
    [NodeType.LOOP]: "Loop",
  };
  return names[nodeType] || nodeType;
}

// Helper function to generate ELI5 explanation
function generateELI5Explanation(nodes: Node[], edges: Edge[]): string {
  if (nodes.length === 0) {
    return "Your workflow is empty. Add some nodes to get started!";
  }

  // Find trigger nodes (nodes with no incoming edges)
  const nodeIds = new Set(nodes.map(n => n.id));
  const nodesWithIncomingEdges = new Set(edges.map(e => e.target));
  const triggerNodes = nodes.filter(n => !nodesWithIncomingEdges.has(n.id));

  // Build a graph to understand the flow
  const graph = new Map<string, string[]>();
  edges.forEach(edge => {
    if (!graph.has(edge.source)) {
      graph.set(edge.source, []);
    }
    graph.get(edge.source)!.push(edge.target);
  });

  // Find action nodes (nodes that are not triggers)
  const actionNodes = nodes.filter(n => nodesWithIncomingEdges.has(n.id) || graph.has(n.id));

  if (triggerNodes.length === 0 && actionNodes.length === 0) {
    return "You have nodes in your workflow, but they're not connected yet. Connect them to create a flow!";
  }

  // Generate explanation
  const explanations: string[] = [];

  // Explain triggers
  if (triggerNodes.length > 0) {
    const triggerNames = triggerNodes.map(n => getNodeTypeName(n.type as NodeType));
    if (triggerNames.length === 1) {
      explanations.push(`**When** ${triggerNames[0]} happens`);
    } else {
      explanations.push(`**When** any of these happen: ${triggerNames.join(", ")}`);
    }
  } else if (nodes.length > 0) {
    explanations.push("**When** you manually trigger it");
  }

  // Explain actions
  if (actionNodes.length > 0) {
    const actionNames = actionNodes.map(n => getNodeTypeName(n.type as NodeType));
    
    // Group actions by what they do
    const notificationActions = actionNames.filter(name => 
      name.includes("Discord") || name.includes("Slack") || name.includes("Telegram")
    );
    const aiActions = actionNames.filter(name => 
      name.includes("AI") || name.includes("Claude") || name.includes("Gemini") || name.includes("OpenAI")
    );
    const dataActions = actionNames.filter(name => 
      name.includes("Sheets") || name.includes("HTTP")
    );
    const otherActions = actionNames.filter(name => 
      !notificationActions.includes(name) && 
      !aiActions.includes(name) && 
      !dataActions.includes(name)
    );

    const actionDescriptions: string[] = [];

    if (notificationActions.length > 0) {
      if (notificationActions.length === 1) {
        actionDescriptions.push(`send a ${notificationActions[0]}`);
      } else {
        actionDescriptions.push(`send notifications via ${notificationActions.join(" and ")}`);
      }
    }

    if (aiActions.length > 0) {
      if (aiActions.length === 1) {
        actionDescriptions.push(`use ${aiActions[0]} to process data`);
      } else {
        actionDescriptions.push(`use AI (${aiActions.join(", ")}) to process data`);
      }
    }

    if (dataActions.length > 0) {
      if (dataActions.length === 1) {
        actionDescriptions.push(`interact with ${dataActions[0]}`);
      } else {
        actionDescriptions.push(`interact with ${dataActions.join(" and ")}`);
      }
    }

    if (otherActions.length > 0) {
      actionDescriptions.push(...otherActions.map(a => `perform ${a}`));
    }

    if (actionDescriptions.length > 0) {
      if (actionDescriptions.length === 1) {
        explanations.push(`**Then** ${actionDescriptions[0]}.`);
      } else {
        explanations.push(`**Then** ${actionDescriptions.slice(0, -1).join(", ")}, and ${actionDescriptions[actionDescriptions.length - 1]}.`);
      }
    }
  }

  // Add connection flow explanation if there are multiple steps
  if (edges.length > 0 && nodes.length > 2) {
    // Build flow paths from triggers
    // Use a map to track node names with indices for duplicate types
    const nodeNameMap = new Map<string, number>();
    const getNodeDisplayName = (nodeId: string): string => {
      const node = nodes.find(n => n.id === nodeId);
      if (!node) return "Unknown";
      
      const baseName = getNodeTypeName(node.type as NodeType);
      const count = nodeNameMap.get(baseName) || 0;
      nodeNameMap.set(baseName, count + 1);
      
      // If there are multiple nodes of the same type, add a number
      const nodesOfSameType = nodes.filter(n => n.type === node.type).length;
      if (nodesOfSameType > 1) {
        // Find the index of this node among nodes of the same type
        const sameTypeNodes = nodes.filter(n => n.type === node.type);
        const index = sameTypeNodes.findIndex(n => n.id === nodeId) + 1;
        return `${baseName} ${index}`;
      }
      return baseName;
    };
    
    const flowPaths: string[][] = [];
    
    // Start from each trigger and build paths
    triggerNodes.forEach(trigger => {
      const visitedInPath = new Set<string>(); // Track visited nodes in current path to prevent cycles
      
      const buildPath = (nodeId: string, currentPath: string[]) => {
        // Prevent infinite recursion from cycles
        if (visitedInPath.has(nodeId)) {
          // Cycle detected, end path here
          flowPaths.push([...currentPath]);
          return;
        }
        
        const node = nodes.find(n => n.id === nodeId);
        if (!node) return;
        
        const nodeName = getNodeDisplayName(nodeId);
        const newPath = [...currentPath, nodeName];
        
        // Mark as visited for this path
        visitedInPath.add(nodeId);
        
        const targets = graph.get(nodeId) || [];
        if (targets.length === 0) {
          // End of path
          flowPaths.push(newPath);
        } else {
          // Continue path for each target
          targets.forEach(targetId => {
            // Create a new visited set for each branch to allow parallel paths
            const branchVisited = new Set(visitedInPath);
            const buildBranch = (branchNodeId: string, branchPath: string[]) => {
              if (branchVisited.has(branchNodeId)) {
                flowPaths.push([...branchPath]);
                return;
              }
              
              const branchNode = nodes.find(n => n.id === branchNodeId);
              if (!branchNode) return;
              
              const branchNodeName = getNodeDisplayName(branchNodeId);
              const newBranchPath = [...branchPath, branchNodeName];
              
              branchVisited.add(branchNodeId);
              
              const branchTargets = graph.get(branchNodeId) || [];
              if (branchTargets.length === 0) {
                flowPaths.push(newBranchPath);
              } else {
                branchTargets.forEach(branchTargetId => {
                  buildBranch(branchTargetId, newBranchPath);
                });
              }
            };
            
            buildBranch(targetId, newPath);
          });
        }
        
        // Remove from visited when backtracking
        visitedInPath.delete(nodeId);
      };
      
      buildPath(trigger.id, []);
    });
    
    // Remove duplicate paths and format
    const uniquePaths = Array.from(new Set(flowPaths.map(path => path.join(" → "))));
    
    if (uniquePaths.length > 0) {
      if (uniquePaths.length === 1) {
        explanations.push(`\nThe workflow flows like this: ${uniquePaths[0]}`);
      } else {
        // Multiple paths (parallel branches)
        explanations.push(`\nThe workflow flows like this:\n${uniquePaths.map((desc, idx) => `  ${idx + 1}. ${desc}`).join("\n")}`);
      }
    }
  }

  return explanations.join(" ");
}

interface WorkflowSummaryProps {
  nodes: Node[];
  edges: Edge[];
}

export function WorkflowSummary({ nodes, edges }: WorkflowSummaryProps) {
  const summary = useMemo(() => {
    if (nodes.length === 0) {
      return "Your workflow is empty. Add some nodes to get started!";
    }
    
    return generateELI5Explanation(nodes, edges);
  }, [nodes, edges]);

  return (
    <Card className="flex flex-col h-full w-full rounded-none overflow-hidden border-0 min-w-0 max-w-full">
      <div className="flex-1 min-h-0 overflow-hidden relative w-full">
        <ScrollArea className="h-full w-full">
          <div className="p-3 md:p-4 lg:p-5">
            <div className="text-sm md:text-base lg:text-lg text-muted-foreground whitespace-pre-wrap wrap-break-word leading-relaxed">
              {summary.split('\n').map((line, idx) => {
                // Handle markdown-style bold
                const parts = line.split(/(\*\*.*?\*\*)/g);
                return (
                  <p key={idx} className="mb-2 last:mb-0">
                    {parts.map((part, partIdx) => {
                      if (part.startsWith('**') && part.endsWith('**')) {
                        return <strong key={partIdx} className="font-semibold text-foreground">{part.slice(2, -2)}</strong>;
                      }
                      return <span key={partIdx}>{part}</span>;
                    })}
                  </p>
                );
              })}
            </div>
          </div>
        </ScrollArea>
      </div>
    </Card>
  );
}
