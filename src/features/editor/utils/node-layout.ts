import { NodeType } from "@/generated/prisma";
import type { Node, Edge } from "@xyflow/react";

// Node spacing constants
const HORIZONTAL_SPACING = 250; // Space between columns
const VERTICAL_SPACING = 150; // Space between nodes in same column
const START_X = 100; // Starting X position for triggers
const START_Y = 100; // Starting Y position

// Check if a node type is a trigger
function isTriggerNode(nodeType: NodeType): boolean {
  const triggerTypes: NodeType[] = [
    NodeType.MANUAL_TRIGGER,
    NodeType.GOOGLE_FORM_TRIGGER,
    NodeType.STRIPE_TRIGGER,
  ];
  return triggerTypes.includes(nodeType);
}

// Check if a node type is an action/execution node
function isActionNode(nodeType: NodeType): boolean {
  const actionTypes: NodeType[] = [
    NodeType.HTTP_REQUEST,
    NodeType.DISCORD,
    NodeType.SLACK,
    NodeType.TELEGRAM,
    NodeType.OPENAI,
    NodeType.ANTHROPIC,
    NodeType.GEMINI,
    NodeType.GROQ,
  NodeType.DELAY_WAIT,
    NodeType.GOOGLE_SHEETS,
    NodeType.GOOGLE_DRIVE,
    NodeType.GMAIL,
    NodeType.GOOGLE_CALENDAR,
  ];
  return actionTypes.includes(nodeType);
}

// Calculate the column (layer) for a node based on workflow structure
function calculateNodeLayer(
  nodeId: string,
  nodeType: NodeType,
  nodes: Node[],
  edges: Edge[]
): number {
  // Triggers are always in layer 0 (leftmost)
  if (isTriggerNode(nodeType)) {
    return 0;
  }

  // For action nodes, find the maximum layer of nodes that connect to it + 1
  const incomingEdges = edges.filter((e) => e.target === nodeId);
  
  if (incomingEdges.length === 0) {
    // No incoming edges, place in layer 1 (right after triggers)
    return 1;
  }

  // Find the maximum layer of source nodes
  let maxLayer = 0;
  for (const edge of incomingEdges) {
    const sourceNode = nodes.find((n) => n.id === edge.source);
    if (sourceNode) {
      // Recursively calculate layer (with memoization would be better, but this works)
      const sourceLayer = calculateNodeLayer(
        sourceNode.id,
        sourceNode.type as NodeType,
        nodes,
        edges
      );
      maxLayer = Math.max(maxLayer, sourceLayer);
    }
  }

  return maxLayer + 1;
}

// Group nodes by their layer
function groupNodesByLayer(
  nodes: Node[],
  edges: Edge[]
): Map<number, Node[]> {
  const layers = new Map<number, Node[]>();

  for (const node of nodes) {
    const layer = calculateNodeLayer(
      node.id,
      node.type as NodeType,
      nodes,
      edges
    );

    if (!layers.has(layer)) {
      layers.set(layer, []);
    }
    layers.get(layer)!.push(node);
  }

  return layers;
}

// Calculate position for a new node
export function calculateNodePosition(
  newNodeType: NodeType,
  existingNodes: Node[],
  existingEdges: Edge[]
): { x: number; y: number } {
  // If no existing nodes, place at start position
  if (existingNodes.length === 0) {
    return { x: START_X, y: START_Y };
  }

  // Group existing nodes by layer (do this once)
  const layers = groupNodesByLayer(existingNodes, existingEdges);
  
  // Determine the layer for the new node based on its type and connections
  let newNodeLayer: number;
  
  if (isTriggerNode(newNodeType)) {
    // Triggers are always in layer 0
    newNodeLayer = 0;
  } else {
    // For action nodes, determine layer based on connections
    const maxLayer = layers.size > 0 ? Math.max(...Array.from(layers.keys())) : -1;
    
    // Check if there are any triggers (layer 0)
    const hasTriggers = layers.has(0) && layers.get(0)!.length > 0;
    
    if (hasTriggers) {
      // Check if there are any incoming edges for this node (connections that will be made)
      // If nodes are being created sequentially without connections yet, we need to estimate
      // Otherwise, use the layer calculation based on existing connections
      
      // Count action nodes that don't have outgoing connections yet
      const actionNodesWithoutOutgoing = existingNodes.filter(node => {
        const isAction = isActionNode(node.type as NodeType);
        const hasOutgoing = existingEdges.some(e => e.source === node.id);
        return isAction && !hasOutgoing;
      });
      
      // If there are action nodes without connections, we're in sequential creation mode
      // Place nodes in sequential layers initially, but they'll be repositioned when connections are made
      if (actionNodesWithoutOutgoing.length > 0) {
        // Place in the next sequential layer
        newNodeLayer = 1 + actionNodesWithoutOutgoing.length;
      } else {
        // All nodes have connections, use normal layer calculation based on connections
        newNodeLayer = maxLayer + 1;
      }
    } else {
      // No triggers yet, place in layer 1 (will be moved to layer 0 if trigger is added later)
      newNodeLayer = 1;
    }
  }

  // Get nodes in the same layer as the new node
  const nodesInSameLayer = layers.get(newNodeLayer) || [];

  // Calculate X position based on layer
  const x = START_X + newNodeLayer * HORIZONTAL_SPACING;

  // Calculate Y position - place below existing nodes in the same layer
  let y = START_Y;
  
  if (nodesInSameLayer.length > 0) {
    // Find the bottommost node in the same layer
    const bottomNode = nodesInSameLayer.reduce((prev, current) => {
      // Estimate node height (most nodes are around 100px tall)
      const nodeHeight = 100;
      const prevBottom = prev.position.y + nodeHeight;
      const currentBottom = current.position.y + nodeHeight;
      return prevBottom > currentBottom ? prev : current;
    });

    const nodeHeight = 100; // Estimated node height
    const bottomY = bottomNode.position.y + nodeHeight;
    y = bottomY + VERTICAL_SPACING;
  } else {
    // First node in this layer, use default Y
    y = START_Y;
  }

  return { x, y };
}

// Auto-layout all nodes in a workflow
export function autoLayoutNodes(nodes: Node[], edges: Edge[]): Node[] {
  if (nodes.length === 0) {
    return nodes;
  }

  // Group nodes by layer
  const layers = groupNodesByLayer(nodes, edges);

  // Sort layers
  const sortedLayers = Array.from(layers.keys()).sort((a, b) => a - b);

  const updatedNodes = nodes.map((node) => {
    const layer = calculateNodeLayer(
      node.id,
      node.type as NodeType,
      nodes,
      edges
    );

    // Calculate X position based on layer
    const x = START_X + layer * HORIZONTAL_SPACING;

    // Get nodes in the same layer
    const nodesInLayer = layers.get(layer) || [];
    const nodeIndexInLayer = nodesInLayer
      .sort((a, b) => {
        // Sort by existing Y position to maintain relative order
        return a.position.y - b.position.y;
      })
      .findIndex((n) => n.id === node.id);

    // Calculate Y position - distribute nodes vertically in the layer
    const y = START_Y + nodeIndexInLayer * VERTICAL_SPACING;

    return {
      ...node,
      position: { x, y },
    };
  });

  return updatedNodes;
}
