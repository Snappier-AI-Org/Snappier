import { Suspense } from "react";
import { ErrorBoundary } from "react-error-boundary";
import { HydrateClient } from "@/trpc/server";
import { prefetchMarketplace } from "@/features/templates/server/prefetch";
import {
  MarketplaceContainer,
  MarketplaceGrid,
  MarketplaceLoading,
  MarketplaceError,
} from "@/features/templates/components/marketplace";
import { marketplaceParamsLoader } from "@/features/templates/params";
import { requireAuth } from "@/lib/auth-utils";
import type { SearchParams } from "nuqs/server";

export const metadata = {
  title: "Template Marketplace | ChatToFlow",
  description: "Discover and use workflow templates created by the community",
};

interface PageProps {
  searchParams: Promise<SearchParams>;
}

export default async function MarketplacePage({ searchParams }: PageProps) {
  await requireAuth();
  
  const params = await marketplaceParamsLoader(searchParams);
  prefetchMarketplace({
    page: params.page,
    search: params.search,
    category: params.category,
    priceFilter: params.priceFilter,
  });

  return (
    <MarketplaceContainer>
      <HydrateClient>
        <ErrorBoundary fallback={<MarketplaceError />}>
          <Suspense fallback={<MarketplaceLoading />}>
            <MarketplaceGrid />
          </Suspense>
        </ErrorBoundary>
      </HydrateClient>
    </MarketplaceContainer>
  );
}
