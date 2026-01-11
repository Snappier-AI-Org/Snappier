"use client";

import { useTemplate, useUpdateTemplate, useDeleteTemplate, useUseTemplate } from "../hooks/use-templates";
import { useRouter } from "next/navigation";
import { useState, useCallback } from "react";
import { toast } from "sonner";
import {
  LayoutTemplate,
  Globe,
  Lock,
  Store,
  Sparkles,
  Users,
  Briefcase,
  MessageSquare,
  Share2,
  Bot,
  RefreshCw,
  Bell,
  ArrowLeft,
  Edit,
  Trash2,
  Download,
  Calendar,
  Eye,
} from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import type { TemplateCategory, TemplateVisibility } from "@/generated/prisma";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import Link from "next/link";

const categoryIcons: Record<TemplateCategory, React.ReactNode> = {
  AUTOMATION: <Sparkles className="size-5" />,
  MARKETING: <Users className="size-5" />,
  SALES: <Briefcase className="size-5" />,
  SUPPORT: <MessageSquare className="size-5" />,
  SOCIAL_MEDIA: <Share2 className="size-5" />,
  AI_ASSISTANT: <Bot className="size-5" />,
  DATA_SYNC: <RefreshCw className="size-5" />,
  NOTIFICATIONS: <Bell className="size-5" />,
  OTHER: <LayoutTemplate className="size-5" />,
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
  PRIVATE: { icon: <Lock className="size-4" />, label: "Private", variant: "secondary" },
  PUBLIC: { icon: <Globe className="size-4" />, label: "Public", variant: "outline" },
  MARKETPLACE: { icon: <Store className="size-4" />, label: "Marketplace", variant: "default" },
};

export const TemplateDetailLoading = () => {
  return (
    <div className="container max-w-4xl py-8 space-y-6">
      <div className="flex items-center gap-4">
        <Skeleton className="h-10 w-10" />
        <Skeleton className="h-8 w-48" />
      </div>
      <Card>
        <CardHeader>
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-full" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-20 w-full" />
          <div className="flex gap-2">
            <Skeleton className="h-6 w-20" />
            <Skeleton className="h-6 w-20" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export const TemplateDetail = ({ templateId }: { templateId: string }) => {
  const router = useRouter();
  const { data: template, isLoading, isError } = useTemplate(templateId);
  const deleteTemplate = useDeleteTemplate();
  const useTemplateMutation = useUseTemplate();
  const [useDialogOpen, setUseDialogOpen] = useState(false);
  const [workflowName, setWorkflowName] = useState("");

  const handleDelete = useCallback(() => {
    deleteTemplate.mutate(
      { id: templateId },
      {
        onSuccess: () => {
          toast.success("Template deleted");
          router.push("/templates");
        },
        onError: (error) => {
          toast.error(error.message);
        },
      }
    );
  }, [templateId, deleteTemplate, router]);

  const handleUse = useCallback(() => {
    useTemplateMutation.mutate(
      { templateId, workflowName: workflowName || template?.name || "New Workflow" },
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
  }, [templateId, workflowName, template?.name, useTemplateMutation, router]);

  if (isLoading) return <TemplateDetailLoading />;
  if (isError || !template) {
    return (
      <div className="container max-w-4xl py-8">
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            Template not found or you don't have access.
          </CardContent>
        </Card>
      </div>
    );
  }

  const visConfig = visibilityConfig[template.visibility];
  const isFree = template.price === 0;
  const priceDisplay = isFree ? "Free" : `$${(template.price / 100).toFixed(2)}`;
  const nodes = template.nodes as Array<{ type: string }> | null;
  const nodeCount = nodes?.length || 0;

  return (
    <>
      <div className="container max-w-4xl py-8 space-y-6">
        {/* Back button */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/templates">
              <ArrowLeft className="size-4 mr-2" />
              Back to Templates
            </Link>
          </Button>
        </div>

        {/* Main card */}
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-4">
                <div className="size-14 flex items-center justify-center rounded-xl bg-primary/10">
                  {categoryIcons[template.category]}
                </div>
                <div>
                  <CardTitle className="text-2xl">{template.name}</CardTitle>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant={visConfig.variant} className="gap-1">
                      {visConfig.icon}
                      {visConfig.label}
                    </Badge>
                    <Badge variant="outline">{categoryLabels[template.category]}</Badge>
                    {template.visibility === "MARKETPLACE" && (
                      <Badge variant={isFree ? "secondary" : "default"}>{priceDisplay}</Badge>
                    )}
                  </div>
                </div>
              </div>
              {template.isOwner && (
                <div className="flex gap-2">
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="outline" size="sm" className="text-destructive">
                        <Trash2 className="size-4 mr-2" />
                        Delete
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete Template?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This action cannot be undone. This will permanently delete the template.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={handleDelete}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Description */}
            <div>
              <h3 className="font-medium mb-2">Description</h3>
              <CardDescription className="text-base">
                {template.description || "No description provided."}
              </CardDescription>
            </div>

            {/* Tags */}
            {template.tags.length > 0 && (
              <div>
                <h3 className="font-medium mb-2">Tags</h3>
                <div className="flex flex-wrap gap-2">
                  {template.tags.map((tag) => (
                    <Badge key={tag} variant="outline">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t">
              <div>
                <p className="text-sm text-muted-foreground">Uses</p>
                <p className="text-2xl font-semibold flex items-center gap-2">
                  <Download className="size-5" />
                  {template.usageCount}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Nodes</p>
                <p className="text-2xl font-semibold flex items-center gap-2">
                  <LayoutTemplate className="size-5" />
                  {nodeCount}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Created</p>
                <p className="text-sm font-medium flex items-center gap-2">
                  <Calendar className="size-4" />
                  {format(new Date(template.createdAt), "MMM d, yyyy")}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Updated</p>
                <p className="text-sm font-medium" suppressHydrationWarning>
                  {formatDistanceToNow(new Date(template.updatedAt), { addSuffix: true })}
                </p>
              </div>
            </div>

            {/* Creator info */}
            <div className="flex items-center gap-3 pt-4 border-t">
              <Avatar>
                <AvatarImage src={template.user.image || undefined} />
                <AvatarFallback>{template.user.name?.charAt(0) || "?"}</AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium">{template.user.name}</p>
                <p className="text-sm text-muted-foreground">Template Creator</p>
              </div>
            </div>
          </CardContent>
          <CardFooter className="border-t pt-6">
            {template.hasAccess ? (
              <Button className="w-full" size="lg" onClick={() => {
                setWorkflowName(template.name);
                setUseDialogOpen(true);
              }}>
                <LayoutTemplate className="size-5 mr-2" />
                Use This Template
              </Button>
            ) : (
              <Button className="w-full" size="lg" disabled>
                <Lock className="size-5 mr-2" />
                Purchase Required ({priceDisplay})
              </Button>
            )}
          </CardFooter>
        </Card>
      </div>

      {/* Use Template Dialog */}
      <Dialog open={useDialogOpen} onOpenChange={setUseDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Workflow from Template</DialogTitle>
            <DialogDescription>
              This will create a new workflow based on "{template.name}".
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
            <Button onClick={handleUse} disabled={useTemplateMutation.isPending || !workflowName.trim()}>
              {useTemplateMutation.isPending ? "Creating..." : "Create Workflow"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

