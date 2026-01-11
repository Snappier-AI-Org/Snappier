import { useTRPC } from '@/trpc/client';
import { useMutation, useQuery, useQueryClient, useSuspenseQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useCredentialsParams } from './use-credentials-params';
import { CredentialType } from '@/generated/prisma';

/**
 * hook to fetch all credentials using suspense
 */

export const useSuspenseCredentials = () => {
    const trpc = useTRPC();
    const [params] = useCredentialsParams(); // get query params from url or defaults

    return useSuspenseQuery(trpc.credentials.getMany.queryOptions(params));
};

/**
 * hook to create new credential
 */

export const useCreateCredential = () => {
    const queryClient = useQueryClient();
    const trpc = useTRPC();

    return useMutation(
  trpc.credentials.create.mutationOptions({
    onSuccess: (data) => {
      toast.success(`Credential "${data.name}" created`);
      // Optimistically update the cache
      queryClient.setQueryData(
        trpc.credentials.getMany.queryKey({}),
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
        trpc.credentials.getMany.queryOptions({}),
      );
    },
    onError: (error) => {
      toast.error(`Failed to create credential: ${error.message}`);
    },
  }),
);
};

/**
 *  Hook to remove a credential
 */
export const useRemoveCredential = () => {
    const queryClient = useQueryClient();
    const trpc = useTRPC();

    return useMutation(
        trpc.credentials.remove.mutationOptions({
            onMutate: async ({ id }) => {
                // Cancel outgoing refetches
                await queryClient.cancelQueries({ queryKey: trpc.credentials.getMany.queryKey({}) });
                
                // Snapshot previous value
                const previous = queryClient.getQueryData(trpc.credentials.getMany.queryKey({}));
                
                // Optimistically update
                queryClient.setQueryData(
                    trpc.credentials.getMany.queryKey({}),
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
                toast.success(`Credential "${data.name}" removed`);
                queryClient.invalidateQueries(
                    trpc.credentials.getMany.queryOptions({})); // Invalidate with empty params to refresh all
                    queryClient.invalidateQueries(
                      trpc.credentials.getOne.queryFilter({ id: data.id }), // Invalidate specific credential query
                    );
            },
            onError: (error, variables, context) => {
                // Rollback on error
                if (context?.previous) {
                    queryClient.setQueryData(
                        trpc.credentials.getMany.queryKey({}),
                        context.previous
                    );
                }
                toast.error(`Failed to remove credential: ${error.message}`);
            }
        })
    )
}

/**
 * Hook to fetch a single credential using suspense
 */
export const useSuspenseCredential = (id: string) => {
  const trpc = useTRPC();
  return useSuspenseQuery(trpc.credentials.getOne.queryOptions({
    id
  }));
};

/**
 * Hook to update a credential
 */

export const useUpdateCredential = () => {
    const queryClient = useQueryClient();
    const trpc = useTRPC();

    return useMutation(
  trpc.credentials.update.mutationOptions({
    onSuccess: (data) => {
      toast.success(`Credential "${data.name}" saved`);
      queryClient.invalidateQueries(
        trpc.credentials.getMany.queryOptions({}), // Invalidate with empty params to refresh all
      );
      queryClient.invalidateQueries(
        trpc.credentials.getOne.queryOptions({ id: data.id }), // Invalidate specific credential query
      );
    },
    onError: (error) => {
      toast.error(`Failed to save credential: ${error.message}`);
    },
  }),
);
};

/**
 * Hook to fetch a credential by type
 */
export const useCredentialsByType = (type: CredentialType) => {
  const trpc = useTRPC();
  return useQuery(trpc.credentials.getByType.queryOptions({ type }));
};