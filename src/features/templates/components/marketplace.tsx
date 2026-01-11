"use client";

import {
  EmptyView,
  EntityContainer,
  EntityHeader,
  EntityPagination,
  EntitySearch,
  ErrorView,
  SkeletonList,
} from "@/components/entity-components";
import { useMarketplace, useAcquireTemplate, useUseTemplate } from "../hooks/use-templates";
import { memo, useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import {
  LayoutTemplate,
  Globe,
  Store,
  Sparkles,
  Users,
  Briefcase,
  MessageSquare,
  Share2,
  Bot,
  RefreshCw,
  Bell,
  Check,
  Download,
  ShoppingCart,
  Eye,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import type { TemplateCategory } from "@/generated/prisma";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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

export const MarketplaceSearch = () => {
  const { search, setSearch, category, setCategory, priceFilter, setPriceFilter } = useMarketplace();

  return (
    <div className="flex flex-col sm:flex-row gap-3">
      <EntitySearch
        value={search}
        onChange={(value) => setSearch(value)}
        placeholder="Search marketplace..."
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
        <Select value={priceFilter} onValueChange={(val) => setPriceFilter(val as typeof priceFilter)}>
          <SelectTrigger className="w-[120px]">
            <SelectValue placeholder="Price" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Prices</SelectItem>
            <SelectItem value="free">Free</SelectItem>
            <SelectItem value="paid">Paid</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
};

export const MarketplaceGrid = () => {
  const { data, isLoading, isError } = useMarketplace();

  if (isLoading) return <SkeletonList count={6} />;
  if (isError) return <ErrorView message="Error loading marketplace" />;
  if (!data) return null;

  if (data.items.length === 0) {
    return <MarketplaceEmpty />;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {data.items.map((template) => (
        <MarketplaceCard key={template.id} data={template} />
      ))}
    </div>
  );
};

export const MarketplaceHeader = () => {
  return (
    <EntityHeader
      title="Marketplace"
      description="Discover and use templates created by the community"
    />
  );
};

export const MarketplacePagination = memo(() => {
  const { data, isFetching, setPage } = useMarketplace();

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

MarketplacePagination.displayName = "MarketplacePagination";

export const MarketplaceContainer = ({ children }: { children: React.ReactNode }) => {
  return (
    <EntityContainer
      header={<MarketplaceHeader />}
      search={<MarketplaceSearch />}
      pagination={<MarketplacePagination />}
    >
      {children}
    </EntityContainer>
  );
};

export const MarketplaceLoading = () => {
  return <SkeletonList count={6} />;
};

export const MarketplaceError = () => {
  return <ErrorView message="Error loading marketplace" />;
};

export const MarketplaceEmpty = () => {
  return (
    <EmptyView message="No templates in the marketplace yet. Be the first to publish one!" />
  );
};

interface MarketplaceCardData {
  id: string;
  name: string;
  description: string | null;
  thumbnail: string | null;
  category: TemplateCategory;
  visibility: string;
  price: number;
  currency: string;
  usageCount: number;
  tags: string[];
  createdAt: Date;
  user: {
    id: string;
    name: string;
    image: string | null;
  };
  hasAccess: boolean;
  isOwner: boolean;
}

export const MarketplaceCard = memo(({ data }: { data: MarketplaceCardData }) => {
  const router = useRouter();
  const acquireTemplate = useAcquireTemplate();
  const useTemplate = useUseTemplate();
  const [useDialogOpen, setUseDialogOpen] = useState(false);
  const [workflowName, setWorkflowName] = useState(data.name);

  const isFree = data.price === 0;
  const priceDisplay = isFree ? "Free" : `$${(data.price / 100).toFixed(2)}`;

  const handleAcquire = useCallback(() => {
    if (!isFree) {
      // For paid templates, redirect to payment (would integrate with Stripe/Polar)
      toast.info("Payment integration coming soon!");
      return;
    }

    acquireTemplate.mutate(
      { templateId: data.id },
      {
        onSuccess: () => {
          toast.success("Template added to your library!");
        },
        onError: (error) => {
          toast.error(error.message);
        },
      }
    );
  }, [data.id, isFree, acquireTemplate]);

  const handleUse = useCallback(() => {
    useTemplate.mutate(
      { templateId: data.id, workflowName },
      {
        onSuccess: (workflow) => {
          toast.success("Workflow created from template!");
          setUseDialogOpen(false);
          router.push(`/workflows/${workflow.id}`);
        },
        onError: (error) => {
          toast.error(error.message);
        },
      }
    );
  }, [data.id, workflowName, useTemplate, router]);

  return (
    <>
      <Card className="group hover:shadow-lg transition-all border-border/50 bg-card/50 hover:bg-card hover:border-border rounded-xl">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <div className="size-10 flex items-center justify-center rounded-lg bg-primary/10">
                {categoryIcons[data.category]}
              </div>
              <div>
                <CardTitle className="text-base line-clamp-1">{data.name}</CardTitle>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  {categoryLabels[data.category]}
                </div>
              </div>
            </div>
            <Badge variant={isFree ? "secondary" : "default"}>{priceDisplay}</Badge>
          </div>
        </CardHeader>
        <CardContent className="pb-3">
          <CardDescription className="line-clamp-2 min-h-[40px]">
            {data.description || "No description provided"}
          </CardDescription>
          <div className="flex flex-wrap gap-1 mt-3">
            {data.tags.slice(0, 3).map((tag) => (
              <Badge key={tag} variant="outline" className="text-xs">
                {tag}
              </Badge>
            ))}
            {data.tags.length > 3 && (
              <Badge variant="outline" className="text-xs">
                +{data.tags.length - 3}
              </Badge>
            )}
          </div>
        </CardContent>
        <CardFooter className="flex items-center justify-between pt-3 border-t">
          <div className="flex items-center gap-2">
            <Avatar className="size-6">
              <AvatarImage src={data.user.image || undefined} />
              <AvatarFallback className="text-xs">
                {data.user.name?.charAt(0) || "?"}
              </AvatarFallback>
            </Avatar>
            <span className="text-xs text-muted-foreground truncate max-w-[80px]">
              {data.user.name}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Download className="size-3" />
              {data.usageCount}
            </span>
            {data.hasAccess ? (
              <Button size="sm" variant="default" onClick={() => setUseDialogOpen(true)}>
                <Check className="size-3 mr-1" />
                Use
              </Button>
            ) : (
              <Button size="sm" variant="outline" onClick={handleAcquire} disabled={acquireTemplate.isPending}>
                {isFree ? (
                  <>
                    <Download className="size-3 mr-1" />
                    Get
                  </>
                ) : (
                  <>
                    <ShoppingCart className="size-3 mr-1" />
                    Buy
                  </>
                )}
              </Button>
            )}
          </div>
        </CardFooter>
      </Card>

      {/* Use Template Dialog */}
      <Dialog open={useDialogOpen} onOpenChange={setUseDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Workflow from Template</DialogTitle>
            <DialogDescription>
              This will create a new workflow based on "{data.name}".
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="workflow-name">Workflow Name</Label>
              <Input
                id="workflow-name"
                value={workflowName}
                onChange={(e) => setWorkflowName(e.target.value)}
                placeholder="My new workflow"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUseDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUse} disabled={useTemplate.isPending || !workflowName.trim()}>
              {useTemplate.isPending ? "Creating..." : "Create Workflow"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
});

MarketplaceCard.displayName = "MarketplaceCard";

