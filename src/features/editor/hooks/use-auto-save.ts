import type { Edge, Node } from "@xyflow/react";
import { useSetAtom } from "jotai";
import { useCallback, useEffect, useRef } from "react";
import { useUpdateWorkflow } from "@/features/workflows/hooks/use-workflows";
import { saveStatusAtom } from "../store/atoms";

interface UseAutoSaveOptions {
  workflowId: string;
  nodes?: Node[];
  edges?: Edge[];
  debounceMs?: number;
  enabled?: boolean;
}

export function useAutoSave({
  workflowId,
  nodes,
  edges,
  debounceMs = 1000,
  enabled = true,
}: UseAutoSaveOptions) {
  const setSaveStatus = useSetAtom(saveStatusAtom);
  const saveWorkflow = useUpdateWorkflow({ silent: true }); // Silent saves for auto-save
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastSavedRef = useRef<string>("");
  const isInitializedRef = useRef(false);
  const isSavingRef = useRef(false);

  // Use refs to always get the latest nodes/edges values
  // This prevents stale closures in the setTimeout callback
  const nodesRef = useRef(nodes || []);
  const edgesRef = useRef(edges || []);

  // Update refs when nodes/edges change
  useEffect(() => {
    if (nodes !== undefined) {
      nodesRef.current = nodes;
    }
    if (edges !== undefined) {
      edgesRef.current = edges;
    }
  }, [nodes, edges]);

  const save = useCallback(() => {
    // If nodes/edges are not provided, this is a read-only instance (just for status)
    if (!nodes || !edges) {
      return;
    }

    if (!enabled || !isInitializedRef.current || isSavingRef.current) {
      return;
    }

    try {
      // Get the latest nodes/edges from refs to ensure we always save current state
      const currentNodes = nodesRef.current;
      const currentEdges = edgesRef.current;

      // Use the local state (nodes, edges) instead of editor state
      // This ensures we're saving the actual current state, not stale editor state
      if (!Array.isArray(currentNodes) || !Array.isArray(currentEdges)) {
        console.warn("[Auto-save] Invalid nodes or edges format");
        return;
      }

      // Create a hash of the current state to avoid unnecessary saves
      const currentState = JSON.stringify({
        nodes: currentNodes,
        edges: currentEdges,
      });

      // Skip if nothing has changed
      if (currentState === lastSavedRef.current) {
        setSaveStatus("saved");
        return;
      }

      // Mark as unsaved since we have pending changes
      setSaveStatus("unsaved");

      // Clear any pending save
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }

      // Debounce the save
      timeoutRef.current = setTimeout(() => {
        // Double-check conditions after debounce
        if (
          !isInitializedRef.current ||
          isSavingRef.current ||
          saveWorkflow.isPending
        ) {
          return;
        }

        try {
          // Get the latest nodes/edges again in case they changed during the debounce
          const latestNodes = nodesRef.current;
          const latestEdges = edgesRef.current;

          // Validate before saving
          if (!Array.isArray(latestNodes) || !Array.isArray(latestEdges)) {
            console.warn(
              "[Auto-save] Invalid nodes or edges format before save",
            );
            return;
          }

          // Check again if state has changed (might have been saved by another call)
          const stateToSave = JSON.stringify({
            nodes: latestNodes,
            edges: latestEdges,
          });
          if (stateToSave === lastSavedRef.current) {
            return; // Already saved
          }

          isSavingRef.current = true;
          setSaveStatus("saving");

          // Map nodes to the expected schema format
          const mappedNodes = latestNodes.map((node) => ({
            id: node.id,
            position: node.position,
            type: node.type as any,
            data: node.data as Record<string, any> | undefined,
          }));

          // Map edges to the expected schema format
          const mappedEdges = latestEdges.map((edge) => ({
            source: edge.source,
            target: edge.target,
            sourceHandle: edge.sourceHandle,
            targetHandle: edge.targetHandle,
          }));

          saveWorkflow.mutate(
            {
              id: workflowId,
              nodes: mappedNodes,
              edges: mappedEdges,
            },
            {
              onSuccess: () => {
                // Update the last saved state on success
                lastSavedRef.current = stateToSave;
                isSavingRef.current = false;
                setSaveStatus("saved");
              },
              onError: (error) => {
                // Only log non-transaction errors (transaction errors are often from concurrent saves)
                const errorMessage = error.message || String(error);
                if (
                  !errorMessage.includes("Transaction") &&
                  !errorMessage.includes("transaction")
                ) {
                  console.error("[Auto-save] Failed to save workflow:", error);
                }
                isSavingRef.current = false;
                setSaveStatus("unsaved"); // Revert to unsaved on error
              },
            },
          );
        } catch (error) {
          console.error("[Auto-save] Error in save callback:", error);
          isSavingRef.current = false;
        }
      }, debounceMs);
    } catch (error) {
      console.error("[Auto-save] Error in save function:", error);
    }
  }, [
    workflowId,
    saveWorkflow,
    debounceMs,
    enabled,
    nodes,
    edges,
    setSaveStatus,
  ]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  // Initialize last saved state when nodes/edges are first loaded
  useEffect(() => {
    // Only initialize if nodes and edges are provided
    if (!nodes || !edges) {
      return;
    }

    if (!isInitializedRef.current) {
      try {
        if (Array.isArray(nodes) && Array.isArray(edges)) {
          lastSavedRef.current = JSON.stringify({ nodes, edges });
          isInitializedRef.current = true;
          setSaveStatus("saved"); // Initialize as saved
        }
      } catch (error) {
        console.error("[Auto-save] Error initializing saved state:", error);
      }
    }
  }, [nodes, edges, setSaveStatus]);

  // Reset initialization when workflow changes
  useEffect(() => {
    isInitializedRef.current = false;
    lastSavedRef.current = "";
    isSavingRef.current = false;
  }, [workflowId]);

  return {
    save,
    isSaving: saveWorkflow.isPending,
    isSaved:
      !saveWorkflow.isPending &&
      isInitializedRef.current &&
      lastSavedRef.current !== "",
  };
}
