"use client";

import { 
  EmptyView, 
  EntityContainer, 
  EntityHeader, 
  EntityItem, 
  EntityList, 
  EntityPagination, 
  EntitySearch, 
  ErrorView, 
  LoadingView,
  SkeletonList
} from "@/components/entity-components";
import {
  useCreateWorkflow,
  useRemoveWorkflow,
  useSuspenseWorkflows,
  useUpdateWorkflowName,
} from "../hooks/use-workflows";
import { useUpgradeModal } from "@/hooks/use-upgrade-modal";
// import { Link, Router, WorkflowIcon } from "lucide-react";
import { memo, useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { useWorkflowsParams } from "../hooks/use-workflows-params";
import { useEntitySearch } from "@/hooks/use-entity-search";
import type { Workflow } from "@/generated/prisma";
import { EditIcon, WorkflowIcon } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import {
  CreateWorkflowDialog,
  type CreateWorkflowFormValues,
} from "./create-workflow-dialog";
import { WorkflowRenameDialog } from "./workflow-rename-dialog";
import type { WorkflowNameFormValues } from "./create-workflow-dialog";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";

export const WorkflowsSearch = () => {
const [params, setParams] = useWorkflowsParams();
const { searchValue, onSearchChange, isSearching } = useEntitySearch({
  params,
  setParams,
});

  return (
    <EntitySearch
      value={searchValue}
      onChange={onSearchChange}
      placeholder="Search Workflows"
      isSearching={isSearching}
    />
  );
};

export const WorkflowsList = () => {
    const workflows = useSuspenseWorkflows();

    return (
      <EntityList
        items={workflows.data.items}
        getKey={(workflow) => workflow.id}
        renderItem={(workflow) => <WorkflowItem data={workflow}/>}
        emptyView={<WorkflowsEmpty />}
      />
    );
};

export const WorkflowsHeader = ({ disabled }: { disabled?: boolean }) => {
  const router = useRouter();
  const createWorkflow = useCreateWorkflow();
  const { handleError, modal } = useUpgradeModal();
  const [dialogOpen, setDialogOpen] = useState(false);

  const handleCreate = (values: CreateWorkflowFormValues) => {
    createWorkflow.mutate(
      { name: values.name },
      {
        onSuccess: (data) => {
          setDialogOpen(false);
          router.push(`/workflows/${data.id}`);
        },
        onError: (error) => {
          handleError(error);
        },
      }
    );
  };

  return (
    <>
      {modal}
      <CreateWorkflowDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSubmit={handleCreate}
        isCreating={createWorkflow.isPending}
      />
      <EntityHeader
        title="Workflows"
        description="Create and manage your workflows"
        onNew={() => setDialogOpen(true)}
        newButtonLabel="New Workflow"
        disabled={disabled}
        isCreating={createWorkflow.isPending}
      />
    </>
  );
};

WorkflowsHeader.displayName = "WorkflowsHeader";

export const WorkflowsPagination = memo(() => {
  const workflows = useSuspenseWorkflows();
  const [params, setParams] = useWorkflowsParams();

  const handlePageChange = useCallback((page: number) => {
    setParams((prev) => ({ ...prev, page }));
  }, [setParams]);

  return (
    <EntityPagination 
      disabled={workflows.isFetching}
      totalPages={workflows.data.totalPages}
      page={workflows.data.page}
      onPageChange={handlePageChange}
    />
  );
});

WorkflowsPagination.displayName = "WorkflowsPagination";

export const WorkflowsContainer = ({
  children
}: {
  children: React.ReactNode;
}) => {
  return (
    <EntityContainer
      header={<WorkflowsHeader />}
      search={<WorkflowsSearch />}
      pagination={<WorkflowsPagination />}
    >
      {children}
    </EntityContainer>
  );
};

export const WorkflowsLoading = () => {
  return <SkeletonList count={5} />;
};

export const WorkflowsError = () => {
  return <ErrorView message="Error loading workflows" />;
};

export const WorkflowsEmpty = () => {
  const router = useRouter();
  const createWorkflow = useCreateWorkflow();
  const { modal, handleError } = useUpgradeModal();
  const [dialogOpen, setDialogOpen] = useState(false);

  const handleCreate = (values: CreateWorkflowFormValues) => {
    createWorkflow.mutate(
      { name: values.name },
      {
        onError: (error) => {
          handleError(error);
        },
        onSuccess: (data) => {
          setDialogOpen(false);
          router.push(`/workflows/${data.id}`);
        },
      }
    );
  };

  return (
    <>
      {modal}
      <CreateWorkflowDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSubmit={handleCreate}
        isCreating={createWorkflow.isPending}
      />
      <EmptyView
        onNew={() => setDialogOpen(true)}
        message="No workflows found. Get started by creating a workflow"
      />
    </>
  );
};

export const WorkflowItem = memo(
  ({
    data,
  }: {
    data: Pick<Workflow, "id" | "name" | "createdAt" | "updatedAt">;
  }) => {
    const removeWorkflow = useRemoveWorkflow();
    const updateWorkflowName = useUpdateWorkflowName();
    const [renameOpen, setRenameOpen] = useState(false);

    const handleRemove = useCallback(() => {
      removeWorkflow.mutate({ id: data.id });
    }, [data.id, removeWorkflow]);

    const handleRenameSubmit = useCallback(
      (values: WorkflowNameFormValues) => {
        updateWorkflowName.mutate(
          { id: data.id, name: values.name },
          {
            onSuccess: () => {
              setRenameOpen(false);
            },
          }
        );
      },
      [data.id, updateWorkflowName]
    );

    const renameMenuItem = (
      <DropdownMenuItem
        onClick={() => setRenameOpen(true)}
        disabled={updateWorkflowName.isPending || removeWorkflow.isPending}
        className="text-xs md:text-sm"
      >
        <div className="flex items-center gap-2">
          <EditIcon className="size-4" />
          Rename
        </div>
      </DropdownMenuItem>
    );

    return (
      <>
        <EntityItem
          href={`/workflows/${data.id}`}
          title={data.name}
          subtitle={
            <span suppressHydrationWarning>
              Updated {formatDistanceToNow(data.updatedAt, { addSuffix: true })}{" "}
              &bull; Created{" "}
              {formatDistanceToNow(data.createdAt, { addSuffix: true })}
            </span>
          }
          image={<WorkflowIcon className="size-5" />}
          onRemove={handleRemove}
          isRemoving={removeWorkflow.isPending}
          menuItems={renameMenuItem}
        />
        <WorkflowRenameDialog
          open={renameOpen}
          onOpenChange={setRenameOpen}
          currentName={data.name}
          onSubmit={handleRenameSubmit}
          isRenaming={updateWorkflowName.isPending}
        />
      </>
    );
  }
);

WorkflowItem.displayName = "WorkflowItem";