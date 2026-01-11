"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useEffect, useState } from "react";
import { useCreateTemplateFromWorkflow } from "../hooks/use-templates";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useTRPC } from "@/trpc/client";
import { useQuery } from "@tanstack/react-query";
import { TemplateCategory, TemplateVisibility } from "@/generated/prisma";
import { Globe, Lock, Store } from "lucide-react";

const formSchema = z.object({
  name: z
    .string()
    .min(1, "Template name is required")
    .max(100, "Template name must be less than 100 characters"),
  description: z.string().max(2000).optional(),
  workflowId: z.string().min(1, "Please select a workflow"),
  category: z.nativeEnum(TemplateCategory),
  visibility: z.nativeEnum(TemplateVisibility),
  price: z.number().min(0),
  tags: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface CreateTemplateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultWorkflowId?: string;
}

export const CreateTemplateDialog = ({
  open,
  onOpenChange,
  defaultWorkflowId,
}: CreateTemplateDialogProps) => {
  const router = useRouter();
  const trpc = useTRPC();
  const createTemplate = useCreateTemplateFromWorkflow();
  const [showPricing, setShowPricing] = useState(false);

  // Fetch user's workflows for the dropdown
  const { data: workflows } = useQuery({
    ...trpc.workflows.getMany.queryOptions({ page: 1, pageSize: 100, search: "" }),
    enabled: open,
  });

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      description: "",
      workflowId: defaultWorkflowId || "",
      category: "OTHER",
      visibility: "PRIVATE",
      price: 0,
      tags: "",
    },
  });

  const watchVisibility = form.watch("visibility");

  useEffect(() => {
    setShowPricing(watchVisibility === "MARKETPLACE");
  }, [watchVisibility]);

  useEffect(() => {
    if (open) {
      form.reset({
        name: "",
        description: "",
        workflowId: defaultWorkflowId || "",
        category: "OTHER",
        visibility: "PRIVATE",
        price: 0,
        tags: "",
      });
    }
  }, [open, form, defaultWorkflowId]);

  const handleSubmit = (values: FormValues) => {
    const tags = values.tags
      ? values.tags.split(",").map((t) => t.trim()).filter(Boolean)
      : [];

    createTemplate.mutate(
      {
        workflowId: values.workflowId,
        name: values.name,
        description: values.description,
        category: values.category,
        visibility: values.visibility,
        price: values.visibility === "MARKETPLACE" ? Math.round(values.price * 100) : 0,
        tags,
      },
      {
        onSuccess: (data) => {
          toast.success("Template created successfully!");
          onOpenChange(false);
          router.push(`/templates/${data.id}`);
        },
        onError: (error) => {
          toast.error(error.message || "Failed to create template");
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Create Template from Workflow</DialogTitle>
          <DialogDescription>
            Save your workflow as a reusable template. You can keep it private, share it publicly,
            or sell it in the marketplace.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="workflowId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Source Workflow</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a workflow" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {workflows?.items.map((workflow) => (
                        <SelectItem key={workflow.id} value={workflow.id}>
                          {workflow.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    The workflow to use as the template
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Template Name</FormLabel>
                  <FormControl>
                    <Input placeholder="My Awesome Template" autoFocus {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Describe what this template does..."
                      className="resize-none"
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="AUTOMATION">Automation</SelectItem>
                        <SelectItem value="MARKETING">Marketing</SelectItem>
                        <SelectItem value="SALES">Sales</SelectItem>
                        <SelectItem value="SUPPORT">Support</SelectItem>
                        <SelectItem value="SOCIAL_MEDIA">Social Media</SelectItem>
                        <SelectItem value="AI_ASSISTANT">AI Assistant</SelectItem>
                        <SelectItem value="DATA_SYNC">Data Sync</SelectItem>
                        <SelectItem value="NOTIFICATIONS">Notifications</SelectItem>
                        <SelectItem value="OTHER">Other</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="visibility"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Visibility</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="PRIVATE">
                          <div className="flex items-center gap-2">
                            <Lock className="size-3" />
                            Private
                          </div>
                        </SelectItem>
                        <SelectItem value="PUBLIC">
                          <div className="flex items-center gap-2">
                            <Globe className="size-3" />
                            Public (Free)
                          </div>
                        </SelectItem>
                        <SelectItem value="MARKETPLACE">
                          <div className="flex items-center gap-2">
                            <Store className="size-3" />
                            Marketplace
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {showPricing && (
              <FormField
                control={form.control}
                name="price"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Price (USD)</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                          $
                        </span>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder="0.00"
                          className="pl-7"
                          {...field}
                          onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                        />
                      </div>
                    </FormControl>
                    <FormDescription>
                      Set to 0 for a free marketplace listing
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <FormField
              control={form.control}
              name="tags"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tags</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="ai, automation, slack (comma separated)"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Add up to 10 tags to help users find your template
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={createTemplate.isPending}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={createTemplate.isPending}>
                {createTemplate.isPending ? "Creating..." : "Create Template"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

