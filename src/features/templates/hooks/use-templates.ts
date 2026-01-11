import { useTRPC } from "@/trpc/client";
import { useMutation, useQuery, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useQueryState, parseAsInteger, parseAsString, parseAsStringLiteral } from "nuqs";
import { TemplateCategory, TemplateVisibility } from "@/generated/prisma";
import { toast } from "sonner";

const DEFAULT_PAGE_SIZE = 12;

export const useMyTemplates = () => {
  const trpc = useTRPC();
  const [page, setPage] = useQueryState("page", parseAsInteger.withDefault(1));
  const [search, setSearch] = useQueryState("search", parseAsString.withDefault(""));
  const [category, setCategory] = useQueryState(
    "category",
    parseAsStringLiteral([
      "all",
      "AUTOMATION",
      "MARKETING",
      "SALES",
      "SUPPORT",
      "SOCIAL_MEDIA",
      "AI_ASSISTANT",
      "DATA_SYNC",
      "NOTIFICATIONS",
      "OTHER",
    ] as const).withDefault("all")
  );
  const [visibility, setVisibility] = useQueryState(
    "visibility",
    parseAsStringLiteral([
      "all",
      "PRIVATE",
      "PUBLIC",
      "MARKETPLACE",
    ] as const).withDefault("all")
  );

  const query = useQuery(
    trpc.templates.getMyTemplates.queryOptions({
      page,
      pageSize: DEFAULT_PAGE_SIZE,
      search,
      category: category === "all" ? undefined : (category as TemplateCategory),
      visibility: visibility === "all" ? undefined : (visibility as TemplateVisibility),
    })
  );

  return {
    ...query,
    page,
    setPage,
    search,
    setSearch,
    category,
    setCategory,
    visibility,
    setVisibility,
  };
};

export const useMarketplace = () => {
  const trpc = useTRPC();
  const [page, setPage] = useQueryState("page", parseAsInteger.withDefault(1));
  const [search, setSearch] = useQueryState("search", parseAsString.withDefault(""));
  const [category, setCategory] = useQueryState(
    "category",
    parseAsStringLiteral([
      "all",
      "AUTOMATION",
      "MARKETING",
      "SALES",
      "SUPPORT",
      "SOCIAL_MEDIA",
      "AI_ASSISTANT",
      "DATA_SYNC",
      "NOTIFICATIONS",
      "OTHER",
    ] as const).withDefault("all")
  );
  const [priceFilter, setPriceFilter] = useQueryState(
    "price",
    parseAsStringLiteral(["all", "free", "paid"] as const).withDefault("all")
  );

  const query = useQuery(
    trpc.templates.getMarketplace.queryOptions({
      page,
      pageSize: DEFAULT_PAGE_SIZE,
      search,
      category: category === "all" ? undefined : (category as TemplateCategory),
      priceFilter,
    })
  );

  return {
    ...query,
    page,
    setPage,
    search,
    setSearch,
    category,
    setCategory,
    priceFilter,
    setPriceFilter,
  };
};

export const useTemplate = (id: string) => {
  const trpc = useTRPC();
  return useQuery(trpc.templates.getOne.queryOptions({ id }));
};

export const useCreateTemplate = () => {
  const queryClient = useQueryClient();
  const trpc = useTRPC();

  return useMutation(
    trpc.templates.create.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries(trpc.templates.getMyTemplates.queryOptions({}));
      },
      onError: (error) => {
        toast.error(`Failed to create template: ${error.message}`);
      },
    })
  );
};

export const useCreateTemplateFromWorkflow = () => {
  const queryClient = useQueryClient();
  const trpc = useTRPC();

  return useMutation(
    trpc.templates.createFromWorkflow.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries(trpc.templates.getMyTemplates.queryOptions({}));
      },
      onError: (error) => {
        toast.error(`Failed to create template: ${error.message}`);
      },
    })
  );
};

export const useUpdateTemplate = () => {
  const queryClient = useQueryClient();
  const trpc = useTRPC();

  return useMutation(
    trpc.templates.update.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries(trpc.templates.getMyTemplates.queryOptions({}));
        queryClient.invalidateQueries(trpc.templates.getMarketplace.queryOptions({}));
      },
      onError: (error) => {
        toast.error(`Failed to update template: ${error.message}`);
      },
    })
  );
};

export const useDeleteTemplate = () => {
  const queryClient = useQueryClient();
  const trpc = useTRPC();

  return useMutation(
    trpc.templates.remove.mutationOptions({
      onSuccess: (data) => {
        toast.success(`Template "${data.name}" deleted`);
        queryClient.invalidateQueries(trpc.templates.getMyTemplates.queryOptions({}));
        queryClient.invalidateQueries(trpc.templates.getMarketplace.queryOptions({}));
      },
      onError: (error) => {
        toast.error(`Failed to delete template: ${error.message}`);
      },
    })
  );
};

export const useAcquireTemplate = () => {
  const queryClient = useQueryClient();
  const trpc = useTRPC();

  return useMutation(
    trpc.templates.acquire.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries(trpc.templates.getMarketplace.queryOptions({}));
        queryClient.invalidateQueries(trpc.templates.getMyPurchases.queryOptions({}));
      },
      onError: (error) => {
        toast.error(`Failed to acquire template: ${error.message}`);
      },
    })
  );
};

export const useUseTemplate = () => {
  const queryClient = useQueryClient();
  const trpc = useTRPC();

  return useMutation(
    trpc.templates.useTemplate.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries(trpc.workflows.getMany.queryOptions({}));
        queryClient.invalidateQueries(trpc.templates.getMyTemplates.queryOptions({}));
        queryClient.invalidateQueries(trpc.templates.getMarketplace.queryOptions({}));
      },
      onError: (error) => {
        toast.error(`Failed to use template: ${error.message}`);
      },
    })
  );
};

export const useMyPurchases = () => {
  const trpc = useTRPC();
  const [page, setPage] = useQueryState("page", parseAsInteger.withDefault(1));

  const query = useQuery(
    trpc.templates.getMyPurchases.queryOptions({
      page,
      pageSize: DEFAULT_PAGE_SIZE,
    })
  );

  return {
    ...query,
    page,
    setPage,
  };
};
