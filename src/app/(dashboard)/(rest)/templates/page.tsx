import { Suspense } from "react";
import { ErrorBoundary } from "react-error-boundary";
import { HydrateClient } from "@/trpc/server";
import { prefetchMyTemplates } from "@/features/templates/server/prefetch";
import {
  TemplatesContainer,
  TemplatesList,
  TemplatesLoading,
  TemplatesError,
} from "@/features/templates/components/templates";
import { templatesParamsLoader } from "@/features/templates/params";
import { requireAuth } from "@/lib/auth-utils";
import type { SearchParams } from "nuqs/server";

export const metadata = {
  title: "My Templates | ChatToFlow",
  description: "Manage your workflow templates",
};

interface PageProps {
  searchParams: Promise<SearchParams>;
}

export default async function TemplatesPage({ searchParams }: PageProps) {
  await requireAuth();
  
  const params = await templatesParamsLoader(searchParams);
  prefetchMyTemplates({
    page: params.page,
    search: params.search,
    category: params.category,
    visibility: params.visibility,
  });

  return (
    <TemplatesContainer>
      <HydrateClient>
        <ErrorBoundary fallback={<TemplatesError />}>
          <Suspense fallback={<TemplatesLoading />}>
            <TemplatesList />
          </Suspense>
        </ErrorBoundary>
      </HydrateClient>
    </TemplatesContainer>
  );
}
