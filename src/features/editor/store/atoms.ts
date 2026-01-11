import type { ReactFlowInstance } from "@xyflow/react";
import { atom } from "jotai";

export const editorAtom = atom<ReactFlowInstance | null>(null);

// Save status atom for sharing between Editor and Header
export type SaveStatus = "saved" | "saving" | "unsaved";
export const saveStatusAtom = atom<SaveStatus>("saved");

// Trigger save atom - increment this to force a save from any component
export const triggerSaveAtom = atom(0);
