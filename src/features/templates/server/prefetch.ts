import { prefetch, trpc } from "@/trpc/server";
import { PAGINATION } from "@/config/constants";
import type { TemplateCategory, TemplateVisibility } from "@/generated/prisma";

interface MyTemplatesParams {
  page?: number;
  search?: string;
  category?: TemplateCategory | "all";
  visibility?: TemplateVisibility | "all";
}

export function prefetchMyTemplates(params: MyTemplatesParams = {}) {
  const { page = 1, search = "", category = "all", visibility = "all" } = params;

  return prefetch(
    trpc.templates.getMyTemplates.queryOptions({
      page,
      pageSize: PAGINATION.DEFAULT_PAGE_SIZE,
      search,
      category: category === "all" ? undefined : category,
      visibility: visibility === "all" ? undefined : visibility,
    })
  );
}

interface MarketplaceParams {
  page?: number;
  search?: string;
  category?: TemplateCategory | "all";
  priceFilter?: "all" | "free" | "paid";
}

export function prefetchMarketplace(params: MarketplaceParams = {}) {
  const { page = 1, search = "", category = "all", priceFilter = "all" } = params;

  return prefetch(
    trpc.templates.getMarketplace.queryOptions({
      page,
      pageSize: PAGINATION.DEFAULT_PAGE_SIZE,
      search,
      category: category === "all" ? undefined : category,
      priceFilter,
    })
  );
}

export function prefetchTemplate(id: string) {
  return prefetch(trpc.templates.getOne.queryOptions({ id }));
}

