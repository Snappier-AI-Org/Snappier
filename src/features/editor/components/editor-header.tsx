"use client";

import { useAtomValue } from "jotai";
import { CheckIcon, LayoutTemplateIcon, Loader2Icon, SaveIcon } from "lucide-react";
import Link from "next/link";
import { memo, useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { SidebarTrigger } from "@/components/ui/sidebar";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Input } from "@/components/ui/input";
import {
  useSuspenseWorkflow,
  useUpdateWorkflow,
  useUpdateWorkflowName,
} from "@/features/workflows/hooks/use-workflows";
import { saveStatusAtom, editorAtom } from "../store/atoms";
import { useAutoSave } from "../hooks/use-auto-save";
import { CreateTemplateDialog } from "@/features/templates/components/create-template-dialog";

export const SaveAsTemplateButton = memo(({ workflowId }: { workflowId: string }) => {
  const [dialogOpen, setDialogOpen] = useState(false);

  return (
    <>
      <CreateTemplateDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        defaultWorkflowId={workflowId}
      />
      <Button
        variant="outline"
        size="sm"
        onClick={() => setDialogOpen(true)}
        className="gap-2"
      >
        <LayoutTemplateIcon className="size-4" />
        <span className="hidden sm:inline">Save as Template</span>
      </Button>
    </>
  );
});

SaveAsTemplateButton.displayName = "SaveAsTemplateButton";

export const EditorSaveButton = memo(() => {
  const saveStatus = useAtomValue(saveStatusAtom);

  // Don't show anything during editing (unsaved state)
  if (saveStatus === "unsaved") {
    return null;
  }

  return (
    <div className="flex items-center gap-1.5 text-sm text-muted-foreground shrink-0">
      {saveStatus === "saving" ? (
        <>
          <Loader2Icon className="size-4 animate-spin" />
          <span className="hidden sm:inline">saving</span>
        </>
      ) : (
        <>
          <SaveIcon className="size-4" />
          <span className="hidden sm:inline">saved</span>
        </>
      )}
    </div>
  );
});

EditorSaveButton.displayName = "EditorSaveButton";

export const EditorNameInput = memo(
  ({ workflowId }: { workflowId: string }) => {
    const { data: workflow } = useSuspenseWorkflow(workflowId);
    const updateWorkflow = useUpdateWorkflowName();

    const [isEditing, setIsEditing] = useState(false);
    const [name, setName] = useState(workflow.name);

    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
      if (workflow.name) {
        setName(workflow.name);
      }
    }, [workflow.name]);

    useEffect(() => {
      if (isEditing && inputRef.current) {
        inputRef.current.focus();
        inputRef.current.select();
      }
    }, [isEditing]);

    const handleSave = async () => {
      if (name === workflow.name) {
        setIsEditing(false);
        return;
      }
      setIsEditing(false);
      try {
        await updateWorkflow.mutateAsync({
          id: workflowId,
          name,
        });
      } catch {
        setName(workflow.name);
      } finally {
        setIsEditing(false);
      }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
      if (e.key === "Enter") {
        handleSave();
      } else if (e.key === "Escape") {
        setName(workflow.name);
        setIsEditing(false);
      }
    };

    if (isEditing) {
      return (
        <div className="flex items-center gap-2">
          <Input
            disabled={updateWorkflow.isPending}
            ref={inputRef}
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={handleSave}
            onKeyDown={handleKeyDown}
            className="h-7 md:h-8 lg:h-9 w-auto min-w-[100px] md:min-w-[150px] lg:min-w-[200px] px-2 md:px-3 text-xs md:text-sm lg:text-base"
          />
          {updateWorkflow.isPending && (
            <Loader2Icon className="size-3 md:size-4 animate-spin text-muted-foreground shrink-0" />
          )}
        </div>
      );
    }
    return (
      <BreadcrumbItem
        onClick={() => setIsEditing(true)}
        className="cursor-pointer hover:text-foreground transition-colors text-xs md:text-sm lg:text-base"
      >
        {workflow.name}
      </BreadcrumbItem>
    );
  },
);

EditorNameInput.displayName = "EditorNameInput";

export const EditorBreadcrumbs = memo(
  ({ workflowId }: { workflowId: string }) => {
    return (
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link prefetch href="/workflows">
                Workflows
              </Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <EditorNameInput workflowId={workflowId} />
        </BreadcrumbList>
      </Breadcrumb>
    );
  },
);

EditorBreadcrumbs.displayName = "EditorBreadcrumbs";

export const EditorHeader = memo(({ workflowId }: { workflowId: string }) => {
  return (
    <header className="flex h-14 md:h-16 lg:h-18 shrink-0 items-center gap-2 md:gap-4 lg:gap-6 border-b px-4 md:px-6 lg:px-8 bg-background">
      <SidebarTrigger className="size-8 md:size-9 lg:size-10 shrink-0" />
        <div className="flex flex-row items-center justify-between gap-x-4 md:gap-x-6 lg:gap-x-8 w-full min-w-0">
            <EditorBreadcrumbs workflowId={workflowId} />
            <div className="flex items-center gap-3">
              <SaveAsTemplateButton workflowId={workflowId} />
              <EditorSaveButton />
            </div>
        </div>
    </header>
  );
});

EditorHeader.displayName = "EditorHeader";
