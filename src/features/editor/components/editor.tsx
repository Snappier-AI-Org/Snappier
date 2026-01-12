"use client";

import { LoadingView, ErrorView } from "@/components/entity-components";
import { useSuspenseWorkflow } from "@/features/workflows/hooks/use-workflows";
import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import {
  ReactFlow,
  applyNodeChanges,
  applyEdgeChanges,
  addEdge,
  type Node,
  type Edge,
  type NodeChange,
  type EdgeChange,
  type Connection,
  Background,
  Controls,
  Panel,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { nodeComponents } from "@/config/node-components";
import { edgeTypes } from "@/config/edge-types";
import { useSetAtom, useAtomValue } from "jotai";
import { editorAtom, triggerSaveAtom } from "../store/atoms";
import { NodeType } from "@/generated/prisma";
import { ExecuteWorkflowButton } from "./execute-workflow-button";
import { WorkflowProvider } from "../context/workflow-context";
import { useAutoSave } from "../hooks/use-auto-save";
import { ChatSummaryPanel } from "./chat-summary-panel";
import { AddNodePanel } from "./add-node-panel";
import { AddNodePanelProvider } from "./add-node-panel-context";
import { RecenterButton } from "./recenter-button";
import { EdgeAnimationController } from "./edge-animation-controller";

export const EditorLoading = () => {
  return <LoadingView message="Loading editor..." />
}

export const EditorError = () => {
    return <ErrorView message="Error Loading Editor" />
}

const initialNodes = [
  { 
    id: 'n1', 
    position: { x: 0, y: 0 }, 
    data: { label: 'Node 1' } 
  },
  { 
    id: 'n2', 
    position: { x: 0, y: 100 }, 
    data: { label: 'Node 2' } 
  },
];

const initialEdges = [
  { id: 'n1-n2', source: 'n1', target: 'n2' }
];

export const Editor = ({ workflowId }: { workflowId: string }) => {
  const { 
    data: workflow 
  } = useSuspenseWorkflow(workflowId);

 const setEditor = useSetAtom(editorAtom);

const [nodes, setNodes] = useState<Node[]>(workflow.nodes);
const [edges, setEdges] = useState<Edge[]>(workflow.edges);

// Track the last synced server state to avoid unnecessary updates
const lastSyncedRef = useRef<string>("");
const hasLocalChangesRef = useRef(false);
const lastLocalStateRef = useRef<string>("");
const initialServerStateRef = useRef<string>("");
const isInitialMountRef = useRef(true);

// Auto-save hook - pass nodes and edges from local state
const { save: autoSave, isSaving, isSaved } = useAutoSave({ 
  workflowId, 
  nodes, 
  edges, 
  debounceMs: 1000 
});

// Watch for external save triggers (from node dialogs)
const triggerSaveCount = useAtomValue(triggerSaveAtom);
useEffect(() => {
  if (triggerSaveCount > 0) {
    // Small delay to ensure state has updated
    setTimeout(() => {
      autoSave();
    }, 100);
  }
}, [triggerSaveCount, autoSave]);

// Reset local changes flag when save completes successfully
useEffect(() => {
  if (isSaved && !isSaving) {
    // Save completed successfully, check if local matches server now
    const localState = JSON.stringify({ nodes, edges });
    const serverState = JSON.stringify({ nodes: workflow.nodes, edges: workflow.edges });
    
    if (localState === serverState) {
      // Local and server are in sync after save
      hasLocalChangesRef.current = false;
      lastSyncedRef.current = serverState;
      // Update initial server state to match current state after successful save
      initialServerStateRef.current = serverState;
    }
  }
}, [isSaved, isSaving, nodes, edges, workflow.nodes, workflow.edges]);

// Initialize initial server state on mount or when workflow changes
useEffect(() => {
  if (isInitialMountRef.current) {
    const serverState = JSON.stringify({ nodes: workflow.nodes, edges: workflow.edges });
    initialServerStateRef.current = serverState;
    lastSyncedRef.current = serverState;
    isInitialMountRef.current = false;
    // Reset local changes flag when loading new workflow
    hasLocalChangesRef.current = false;
  }
}, [workflow.nodes, workflow.edges, workflowId]);

// Reset mount flag when workflowId changes
useEffect(() => {
  isInitialMountRef.current = true;
  hasLocalChangesRef.current = false;
  lastSyncedRef.current = "";
  initialServerStateRef.current = "";
}, [workflowId]);

// Track local changes - mark when user makes changes
useEffect(() => {
  const localState = JSON.stringify({ nodes, edges });
  const initialServerState = initialServerStateRef.current;
  
  // If local state differs from initial server state, we have unsaved changes
  if (localState !== initialServerState) {
    hasLocalChangesRef.current = true;
    lastLocalStateRef.current = localState;
  } else {
    // Local matches initial server state, no unsaved changes
    hasLocalChangesRef.current = false;
  }
}, [nodes, edges]);

// Sync nodes and edges when workflow data changes (from server)
// IMPORTANT: Only sync when we have NO local changes and are NOT saving
useEffect(() => {
  // Don't sync if we're currently saving - wait for save to complete
  if (isSaving) {
    return;
  }

  // CRITICAL: Don't sync if we have unsaved local changes - this prevents overwriting deletions
  if (hasLocalChangesRef.current) {
    return;
  }

  const serverState = JSON.stringify({ nodes: workflow.nodes, edges: workflow.edges });
  const localState = JSON.stringify({ nodes, edges });
  
  // Only sync if server state is different from local state AND we don't have local changes
  if (serverState !== localState && serverState !== lastSyncedRef.current) {
    // This means server has new data (from another client or our own save completed)
    setNodes(workflow.nodes);
    setEdges(workflow.edges);
    lastSyncedRef.current = serverState;
    // Update initial server state to match current server state after sync
    initialServerStateRef.current = serverState;
  } else if (serverState === localState) {
    // Local and server match, update the refs
    lastSyncedRef.current = serverState;
    initialServerStateRef.current = serverState;
    // Clear the unsaved changes flag since we're in sync
    hasLocalChangesRef.current = false;
  }
}, [workflow.nodes, workflow.edges, isSaving]); // Don't include nodes/edges to avoid loops

const onNodesChange = useCallback(
  (changes: NodeChange[]) => {
    setNodes((nodesSnapshot) => {
      const updated = applyNodeChanges(changes, nodesSnapshot);
      // Trigger auto-save after ReactFlow updates its internal state
      // Use a small delay to ensure ReactFlow has processed the changes
      setTimeout(() => {
        try {
          autoSave();
        } catch (error) {
          console.error("[Editor] Auto-save error:", error);
        }
      }, 100);
      return updated;
    });
  },
  [autoSave],
);
const onEdgesChange = useCallback(
  (changes: EdgeChange[]) => {
    setEdges((edgesSnapshot) => {
      const updated = applyEdgeChanges(changes, edgesSnapshot);
      // Trigger auto-save after ReactFlow updates its internal state
      setTimeout(() => {
        try {
          autoSave();
        } catch (error) {
          console.error("[Editor] Auto-save error:", error);
        }
      }, 100);
      return updated;
    });
  },
  [autoSave],
);
const onConnect = useCallback(
  (params: Connection) => {
    setEdges((edgesSnapshot) => {
      const updated = addEdge(params, edgesSnapshot);
      // Trigger auto-save after ReactFlow updates its internal state
      setTimeout(() => {
        try {
          autoSave();
        } catch (error) {
          console.error("[Editor] Auto-save error:", error);
        }
      }, 100);
      return updated;
    });
  },
  [autoSave],
);
 
const hasManualTrigger = useMemo(() => {
  return nodes.some((node) => node.type === NodeType.MANUAL_TRIGGER);
}, [nodes]);

  return (
    <WorkflowProvider workflowId={workflowId}>
      <AddNodePanelProvider>
        <div className="relative size-full">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            nodeTypes={nodeComponents}
            edgeTypes={edgeTypes}
            onInit={setEditor}
            fitView
            snapGrid={[10, 10]}
            snapToGrid
            panOnDrag={false}
            selectionOnDrag
            panOnScroll
            proOptions={{ hideAttribution: true }}
            nodesDraggable={true}
            nodesConnectable={true}
            elementsSelectable={true}
            deleteKeyCode={["Backspace", "Delete"]}
            multiSelectionKeyCode={["Meta", "Control"]}
            connectionRadius={20}
            defaultViewport={{ x: 0, y: 0, zoom: 1 }}
            onlyRenderVisibleElements={true}
            minZoom={0.1}
            maxZoom={2}
          >
          {/* Edge animation controller - syncs edge animation with execution state */}
          <EdgeAnimationController workflowId={workflowId} />
          <Background className="bg-transparent!" color="var(--flow-dot-color, rgba(0, 33, 243, 0.15))" gap={16} size={1} />
          <Controls className="left-4! bottom-4!" />
          <Panel position="top-right" className="mr-4 mt-4">
            <RecenterButton />
          </Panel>
          {hasManualTrigger && (
            <Panel position="bottom-center">
              <ExecuteWorkflowButton workflowId={workflowId} />
            </Panel>
          )}
          {/* Integrations Panel - must be inside ReactFlow for useReactFlow hook */}
          <AddNodePanel />
          </ReactFlow>

          {/* Floating Chat & Summary Panel - Hidden */}
          {/* <ChatSummaryPanel nodes={nodes} edges={edges} /> */}
        </div>
      </AddNodePanelProvider>
    </WorkflowProvider>
  );
};
