import { useTRPC } from '@/trpc/client';
import { useMutation, useQueryClient, useSuspenseQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useWorkflowsParams } from './use-workflows-params';

/**
 * hook to fetch all workflows using suspense
 */

export const useSuspenseWorkflows = () => {
    const trpc = useTRPC();
    const [params] = useWorkflowsParams(); // get query params from url or defaults

    return useSuspenseQuery(trpc.workflows.getMany.queryOptions(params));
};

/**
 * hook to create new workflow
 */

export const useCreateWorkflow = () => {
    const queryClient = useQueryClient();
    const trpc = useTRPC();

    return useMutation(
  trpc.workflows.create.mutationOptions({
    onSuccess: (data) => {
      toast.success(`Workflow "${data.name}" created`);
      // Optimistically update the cache
      queryClient.setQueryData(
        trpc.workflows.getMany.queryKey({}),
        (old: any) => {
          if (!old) return old;
          return {
            ...old,
            items: [data, ...old.items].slice(0, old.pageSize),
            totalCount: old.totalCount + 1,
          };
        }
      );
      // Also invalidate to ensure consistency
      queryClient.invalidateQueries(
        trpc.workflows.getMany.queryOptions({}),
      );
    },
    onError: (error) => {
      toast.error(`Failed to create workflow: ${error.message}`);
    },
  }),
);
};

/**
 *  Hook to remove a workflow
 */
export const useRemoveWorkflow = () => {
    const queryClient = useQueryClient();
    const trpc = useTRPC();

    return useMutation(
        trpc.workflows.remove.mutationOptions({
            onMutate: async ({ id }) => {
                // Cancel outgoing refetches
                await queryClient.cancelQueries({ queryKey: trpc.workflows.getMany.queryKey({}) });
                
                // Snapshot previous value
                const previous = queryClient.getQueryData(trpc.workflows.getMany.queryKey({}));
                
                // Optimistically update
                queryClient.setQueryData(
                    trpc.workflows.getMany.queryKey({}),
                    (old: any) => {
                        if (!old) return old;
                        return {
                            ...old,
                            items: old.items.filter((item: any) => item.id !== id),
                            totalCount: Math.max(0, old.totalCount - 1),
                        };
                    }
                );
                
                return { previous };
            },
            onSuccess: (data) => {
                toast.success(`Workflow "${data.name}" removed`);
                queryClient.invalidateQueries(
                    trpc.workflows.getMany.queryOptions({})); // Invalidate with empty params to refresh all
                    queryClient.invalidateQueries(
                      trpc.workflows.getOne.queryFilter({ id: data.id }), // Invalidate specific workflow query
                    );
            },
            onError: (error, variables, context) => {
                // Rollback on error
                if (context?.previous) {
                    queryClient.setQueryData(
                        trpc.workflows.getMany.queryKey({}),
                        context.previous
                    );
                }
                toast.error(`Failed to remove workflow: ${error.message}`);
            }
        })
    )
}

/**
 * Hook to fetch a single workflow using suspense
 */
export const useSuspenseWorkflow = (id: string) => {
  const trpc = useTRPC();
  return useSuspenseQuery(trpc.workflows.getOne.queryOptions({
    id
  }));
};

/**
 * Hook to update a workflow name
 */

export const useUpdateWorkflowName = () => {
    const queryClient = useQueryClient();
    const trpc = useTRPC();

    return useMutation(
  trpc.workflows.updateName.mutationOptions({
    onSuccess: (data) => {
      toast.success(`Workflow "${data.name}" updated`);
      queryClient.invalidateQueries(
        trpc.workflows.getMany.queryOptions({}), // Invalidate with empty params to refresh all
      );
      queryClient.invalidateQueries(
        trpc.workflows.getOne.queryOptions({ id: data.id }), // Invalidate specific workflow query
      );
    },
    onError: (error) => {
      toast.error(`Failed to update workflow: ${error.message}`);
    },
  }),
);
};

/**
 * Hook to update a workflow
 */

export const useUpdateWorkflow = (options?: { silent?: boolean }) => {
    const queryClient = useQueryClient();
    const trpc = useTRPC();
    const silent = options?.silent ?? false;

    return useMutation(
  trpc.workflows.update.mutationOptions({
    onSuccess: (data) => {
      if (!silent) {
        toast.success(`Workflow "${data.name}" saved`);
      }
      queryClient.invalidateQueries(
        trpc.workflows.getMany.queryOptions({}), // Invalidate with empty params to refresh all
      );
      queryClient.invalidateQueries(
        trpc.workflows.getOne.queryOptions({ id: data.id }), // Invalidate specific workflow query
      );
    },
    onError: (error) => {
      if (!silent) {
        toast.error(`Failed to save workflow: ${error.message}`);
      }
    },
  }),
);
};

/**
 * Hook to execute a workflow
 */

export const useExecuteWorkflow = () => {
    const queryClient = useQueryClient();
    const trpc = useTRPC();

    return useMutation(
  trpc.workflows.execute.mutationOptions({
    onSuccess: (data) => {
      toast.success(`Workflow "${data.name}" executed`);
    },
    onError: (error) => {
      toast.error(`Failed to execute workflow: ${error.message}`);
    },
  }),
);
};