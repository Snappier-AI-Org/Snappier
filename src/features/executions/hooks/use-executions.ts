import { useTRPC } from '@/trpc/client';
import { useSuspenseQuery, useQuery } from '@tanstack/react-query';
import { useExecutionsParams } from './use-executions-params';

/**
 * hook to fetch all executions using suspense
 */

export const useSuspenseExecutions = () => {
    const trpc = useTRPC();
    const [params] = useExecutionsParams(); // get query params from url or defaults

    return useSuspenseQuery(trpc.executions.getMany.queryOptions(params));
};

/**
 * Hook to fetch a single execution using suspense
 */
export const useSuspenseExecution = (id: string) => {
  const trpc = useTRPC();
  return useSuspenseQuery(trpc.executions.getOne.queryOptions({
    id
  }));
};

/**
 * Hook to fetch the latest execution for a workflow
 */
export const useLatestExecution = (workflowId: string | undefined) => {
  const trpc = useTRPC();
  return useQuery({
    ...trpc.executions.getLatestByWorkflow.queryOptions({
      workflowId: workflowId || "",
    }),
    enabled: !!workflowId,
    refetchInterval: 2000, // Poll every 2 seconds when enabled
  });
};
