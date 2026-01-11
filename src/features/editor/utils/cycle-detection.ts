import type { Node, Edge } from "@xyflow/react";
import toposort from "toposort";

/**
 * Detects if a workflow contains a cycle
 * @param nodes - Array of nodes in the workflow
 * @param edges - Array of edges (connections) in the workflow
 * @returns Object with hasCycle boolean and cyclePath array if cycle exists
 */
export function detectCycle(
  nodes: Node[],
  edges: Edge[]
): { hasCycle: boolean; cyclePath?: string[] } {
  if (edges.length === 0) {
    return { hasCycle: false };
  }

  try {
    // Create edges array for toposort
    const edgesArray: [string, string][] = edges.map((edge) => [
      edge.source,
      edge.target,
    ]);

    // Add nodes with no connections as self-edges to ensure they're included
    const connectedNodeIds = new Set<string>();
    for (const edge of edges) {
      connectedNodeIds.add(edge.source);
      connectedNodeIds.add(edge.target);
    }

    for (const node of nodes) {
      if (!connectedNodeIds.has(node.id)) {
        edgesArray.push([node.id, node.id]);
      }
    }

    // Try to perform topological sort - if it fails, there's a cycle
    const sortedNodeIds = toposort(edgesArray);
    return { hasCycle: false };
  } catch (error) {
    if (error instanceof Error && error.message.includes("Cyclic")) {
      // Try to find the cycle path
      const cyclePath = findCyclePath(nodes, edges);
      return { hasCycle: true, cyclePath };
    }
    return { hasCycle: false };
  }
}

/**
 * Attempts to find the path of nodes involved in a cycle
 */
function findCyclePath(nodes: Node[], edges: Edge[]): string[] {
  // Build adjacency list
  const graph = new Map<string, string[]>();
  for (const edge of edges) {
    if (!graph.has(edge.source)) {
      graph.set(edge.source, []);
    }
    graph.get(edge.source)!.push(edge.target);
  }

  // DFS to find cycle
  const visited = new Set<string>();
  const recStack = new Set<string>();
  const path: string[] = [];
  let cycleStartNode: string | null = null;

  function dfs(nodeId: string): boolean {
    if (recStack.has(nodeId)) {
      // Found a cycle - this node is in the recursion stack
      cycleStartNode = nodeId;
      return true;
    }

    if (visited.has(nodeId)) {
      return false;
    }

    visited.add(nodeId);
    recStack.add(nodeId);
    path.push(nodeId);

    const neighbors = graph.get(nodeId) || [];
    for (const neighbor of neighbors) {
      if (dfs(neighbor)) {
        return true;
      }
    }

    recStack.delete(nodeId);
    path.pop();
    return false;
  }

  // Check all nodes
  for (const node of nodes) {
    if (!visited.has(node.id)) {
      if (dfs(node.id)) {
        // Extract cycle from path
        if (cycleStartNode) {
          const cycleStartIndex = path.indexOf(cycleStartNode);
          if (cycleStartIndex !== -1) {
            // Return the cycle: from cycleStartNode back to itself
            return [...path.slice(cycleStartIndex), cycleStartNode];
          }
        }
        // Fallback: return the path if we can't find the exact cycle
        return path.length > 0 ? [...path, path[0]] : [];
      }
    }
  }

  return [];
}

