"use client";

import { 
  EmptyView, 
  EntityContainer, 
  EntityHeader, 
  EntityItem, 
  EntityList, 
  EntityPagination, 
  ErrorView, 
  LoadingView,
  SkeletonList
} from "@/components/entity-components";
import { useSuspenseExecutions } from "../hooks/use-executions";
// import { Link, Router, CredentialIcon } from "lucide-react";
import { use, memo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useExecutionsParams } from "../hooks/use-executions-params";
import { ExecutionStatus } from "@/generated/prisma";
import type { Credential, Execution } from "@/generated/prisma";
// import { CredentialIcon } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { CheckCircle2Icon, Clock, ClockIcon, Loader2Icon, XCircleIcon } from "lucide-react";

export const ExecutionsList = () => {
    const executions = useSuspenseExecutions();

    return (
      <EntityList
        items={executions.data.items}
        getKey={(execution) => execution.id}
        renderItem={(execution) => <ExecutionItem data={execution}/>}
        emptyView={<ExecutionsEmpty />}
      />
    );
};

export const ExecutionsHeader = ({ disabled }: { disabled?: boolean }) => {

  return (
      <EntityHeader
        title="Executions"
        description="View your workflow execution history"
      />
  );
};

export const ExecutionsPagination = memo(() => {
  const executions = useSuspenseExecutions();
  const [params, setParams] = useExecutionsParams();

  const handlePageChange = useCallback((page: number) => {
    setParams({ ...params, page });
  }, [params, setParams]);

  return (
    <EntityPagination 
      disabled={executions.isFetching}
      totalPages={executions.data.totalPages}
      page={executions.data.page}
      onPageChange={handlePageChange}
    />
  );
});

ExecutionsPagination.displayName = "ExecutionsPagination";

export const ExecutionsContainer = ({
  children
}: {
  children: React.ReactNode;
}) => {
  return (
    <EntityContainer
      header={<ExecutionsHeader />}
      pagination={<ExecutionsPagination />}
    >
      {children}
    </EntityContainer>
  );
};

export const ExecutionsLoading = () => {
  return <SkeletonList count={5} />;
};

export const ExecutionsError = () => {
  return <ErrorView message="Error loading executions" />;
};

export const ExecutionsEmpty = () => {
  return (
      <EmptyView
        message="No executions found. Get started by creating an execution"
      />
  )
}

const getStatusIcon = (status: ExecutionStatus) => {
  switch (status) {
    case ExecutionStatus.SUCCESS:
      return <CheckCircle2Icon className="size-5 text-green-600" />;
    case ExecutionStatus.FAILED:
      return <XCircleIcon className="size-5 text-red-600" />;
    case ExecutionStatus.RUNNING:
      return <Loader2Icon className="size-5 text-blue-600 animate-spin" />;
    default:
      return <ClockIcon className="size-5 text-muted-foreground" />;

  }
};

const formatStatus = (status: ExecutionStatus) => {
  return status.charAt(0) + status.slice(1).toLowerCase();
};

export const ExecutionItem = memo(({
  data,
}: {
  data: Execution & {
    workflow: {
      id: string;
      name: string;
    };
  }
}) => {
  const duration = data.completedAt
  ? Math.round(
      (new Date(data.completedAt).getTime() - new Date(data.startedAt).getTime()) / 1000,
    )
  : null;

  const subtitle = (
      <>
      {data.workflow.name} &bull; Started{" "}
      {formatDistanceToNow(data.startedAt, { addSuffix: true })}
      {duration !== null && <> &bull; Took {duration}s </>}
      </>
  )
  return (
    <EntityItem
      href={`/executions/${data.id}`}
      title={formatStatus(data.status)}
      subtitle={subtitle}
      image={getStatusIcon(data.status)}
    />
  )
});

ExecutionItem.displayName = "ExecutionItem";