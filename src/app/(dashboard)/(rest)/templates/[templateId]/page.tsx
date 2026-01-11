import { Suspense } from "react";
import { HydrateClient } from "@/trpc/server";
import { prefetchTemplate } from "@/features/templates/server/prefetch";
import { TemplateDetail, TemplateDetailLoading } from "@/features/templates/components/template-detail";
import { requireAuth } from "@/lib/auth-utils";

interface PageProps {
  params: Promise<{ templateId: string }>;
}

export async function generateMetadata({ params }: PageProps) {
  const { templateId } = await params;
  return {
    title: `Template | Snappier`,
    description: "View template details",
  };
}

export default async function TemplateDetailPage({ params }: PageProps) {
  await requireAuth();
  
  const { templateId } = await params;
  prefetchTemplate(templateId);

  return (
    <HydrateClient>
      <Suspense fallback={<TemplateDetailLoading />}>
        <TemplateDetail templateId={templateId} />
      </Suspense>
    </HydrateClient>
  );
}
