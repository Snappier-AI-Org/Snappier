import {
  defaultShouldDehydrateQuery,
  QueryClient,
} from '@tanstack/react-query';
import superjson from 'superjson';

export function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000, // 1 minute - increased from 30 seconds
        gcTime: 5 * 60 * 1000, // 5 minutes - keep data in cache longer
        refetchOnWindowFocus: false, // Don't refetch on window focus for better performance
        refetchOnReconnect: true, // Only refetch on reconnect
        retry: 1, // Reduce retries for faster failure
      },
      dehydrate: {
        serializeData: superjson.serialize,
        shouldDehydrateQuery: (query) =>
          defaultShouldDehydrateQuery(query) ||
          query.state.status === 'pending',
      },
      hydrate: {
        deserializeData: superjson.deserialize,
      },
    },
  });
}