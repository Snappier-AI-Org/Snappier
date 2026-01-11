"use client";

import {
  EmptyView,
  EntityContainer,
  EntityHeader,
  EntityItem,
  EntityList,
  EntityPagination,
  EntitySearch,
  ErrorView,
  SkeletonList,
} from "@/components/entity-components";
import {
  useMyTemplates,
  useDeleteTemplate,
  useCreateTemplateFromWorkflow,
} from "../hooks/use-templates";
import { useUpgradeModal } from "@/hooks/use-upgrade-modal";
import { memo, useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { LayoutTemplate, Globe, Lock, Store, Sparkles, Users, Briefcase, MessageSquare, Share2, Bot, RefreshCw, Bell } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import type { TemplateCategory, TemplateVisibility } from "@/generated/prisma";
import { Badge } from "@/components/ui/badge";
import { CreateTemplateDialog } from "./create-template-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const categoryIcons: Record<TemplateCategory, React.ReactNode> = {
  AUTOMATION: <Sparkles className="size-4" />,
  MARKETING: <Users className="size-4" />,
  SALES: <Briefcase className="size-4" />,
  SUPPORT: <MessageSquare className="size-4" />,
  SOCIAL_MEDIA: <Share2 className="size-4" />,
  AI_ASSISTANT: <Bot className="size-4" />,
  DATA_SYNC: <RefreshCw className="size-4" />,
  NOTIFICATIONS: <Bell className="size-4" />,
  OTHER: <LayoutTemplate className="size-4" />,
};

const categoryLabels: Record<TemplateCategory, string> = {
  AUTOMATION: "Automation",
  MARKETING: "Marketing",
  SALES: "Sales",
  SUPPORT: "Support",
  SOCIAL_MEDIA: "Social Media",
  AI_ASSISTANT: "AI Assistant",
  DATA_SYNC: "Data Sync",
  NOTIFICATIONS: "Notifications",
  OTHER: "Other",
};

const visibilityConfig: Record<
  TemplateVisibility,
  { icon: React.ReactNode; label: string; variant: "default" | "secondary" | "outline" }
> = {
  PRIVATE: { icon: <Lock className="size-3" />, label: "Private", variant: "secondary" },
  PUBLIC: { icon: <Globe className="size-3" />, label: "Public", variant: "outline" },
  MARKETPLACE: { icon: <Store className="size-3" />, label: "Marketplace", variant: "default" },
};

export const TemplatesSearch = () => {
  const { search, setSearch, category, setCategory, visibility, setVisibility } = useMyTemplates();

  return (
    <div className="flex flex-col sm:flex-row gap-3">
      <EntitySearch
        value={search}
        onChange={(value) => setSearch(value)}
        placeholder="Search templates..."
        isSearching={false}
      />
      <div className="flex gap-2">
        <Select value={category} onValueChange={(val) => setCategory(val as typeof category)}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {Object.entries(categoryLabels).map(([key, label]) => (
              <SelectItem key={key} value={key}>
                <div className="flex items-center gap-2">
                  {categoryIcons[key as TemplateCategory]}
                  {label}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={visibility} onValueChange={(val) => setVisibility(val as typeof visibility)}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Visibility" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="PRIVATE">
              <div className="flex items-center gap-2">
                <Lock className="size-3" /> Private
              </div>
            </SelectItem>
            <SelectItem value="PUBLIC">
              <div className="flex items-center gap-2">
                <Globe className="size-3" /> Public
              </div>
            </SelectItem>
            <SelectItem value="MARKETPLACE">
              <div className="flex items-center gap-2">
                <Store className="size-3" /> Marketplace
              </div>
            </SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
};

export const TemplatesList = () => {
  const { data, isLoading, isError } = useMyTemplates();

  if (isLoading) return <SkeletonList count={6} />;
  if (isError) return <ErrorView message="Error loading templates" />;
  if (!data) return null;

  return (
    <EntityList
      items={data.items}
      getKey={(template) => template.id}
      renderItem={(template) => <TemplateItem data={template} />}
      emptyView={<TemplatesEmpty />}
    />
  );
};

export const TemplatesHeader = ({ disabled }: { disabled?: boolean }) => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const { modal } = useUpgradeModal();

  return (
    <>
      {modal}
      <CreateTemplateDialog open={dialogOpen} onOpenChange={setDialogOpen} />
      <EntityHeader
        title="My Templates"
        description="Create and manage your workflow templates"
        onNew={() => setDialogOpen(true)}
        newButtonLabel="New Template"
        disabled={disabled}
      />
    </>
  );
};

export const TemplatesPagination = memo(() => {
  const { data, isFetching, setPage } = useMyTemplates();

  if (!data) return null;

  return (
    <EntityPagination
      disabled={isFetching}
      totalPages={data.totalPages}
      page={data.page}
      onPageChange={setPage}
    />
  );
});

TemplatesPagination.displayName = "TemplatesPagination";

export const TemplatesContainer = ({ children }: { children: React.ReactNode }) => {
  return (
    <EntityContainer
      header={<TemplatesHeader />}
      search={<TemplatesSearch />}
      pagination={<TemplatesPagination />}
    >
      {children}
    </EntityContainer>
  );
};

export const TemplatesLoading = () => {
  return <SkeletonList count={6} />;
};

export const TemplatesError = () => {
  return <ErrorView message="Error loading templates" />;
};

export const TemplatesEmpty = () => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const { modal } = useUpgradeModal();

  return (
    <>
      {modal}
      <CreateTemplateDialog open={dialogOpen} onOpenChange={setDialogOpen} />
      <EmptyView
        onNew={() => setDialogOpen(true)}
        message="No templates yet. Create your first template from a workflow or start from scratch."
      />
    </>
  );
};

interface TemplateItemData {
  id: string;
  name: string;
  description: string | null;
  category: TemplateCategory;
  visibility: TemplateVisibility;
  price: number;
  usageCount: number;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}

export const TemplateItem = memo(({ data }: { data: TemplateItemData }) => {
  const deleteTemplate = useDeleteTemplate();
  const router = useRouter();

  const handleRemove = useCallback(() => {
    deleteTemplate.mutate({ id: data.id });
  }, [data.id, deleteTemplate]);

  const visConfig = visibilityConfig[data.visibility];

  return (
    <EntityItem
      href={`/templates/${data.id}`}
      title={
        <div className="flex items-center gap-2">
          {data.name}
          <Badge variant={visConfig.variant} className="text-xs gap-1">
            {visConfig.icon}
            {visConfig.label}
          </Badge>
          {data.visibility === "MARKETPLACE" && data.price > 0 && (
            <Badge variant="outline" className="text-xs">
              ${(data.price / 100).toFixed(2)}
            </Badge>
          )}
        </div>
      }
      subtitle={
        <div className="flex flex-col gap-1">
          <span className="line-clamp-1 text-muted-foreground">
            {data.description || "No description"}
          </span>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              {categoryIcons[data.category]}
              {categoryLabels[data.category]}
            </span>
            <span>•</span>
            <span>Used {data.usageCount} times</span>
            <span>•</span>
            <span suppressHydrationWarning>
              Updated {formatDistanceToNow(data.updatedAt, { addSuffix: true })}
            </span>
          </div>
        </div>
      }
      image={
        <div className="size-10 flex items-center justify-center rounded-lg bg-primary/10">
          {categoryIcons[data.category]}
        </div>
      }
      onRemove={handleRemove}
      isRemoving={deleteTemplate.isPending}
    />
  );
});

TemplateItem.displayName = "TemplateItem";

