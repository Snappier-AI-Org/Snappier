"use client";

import z from "zod";
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
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { CredentialSelect } from "@/features/credentials/components/credential-select";
import { CredentialType } from "@/generated/prisma";
import {
  ConfigDialogDescription,
  ConfigDialogFooter,
  ConfigDialogHeader,
  ConfigDialogTitle,
  ConfigurationPanelLayout,
} from "@/features/editor/components/configuration-panel-layout";
import { VariableTokenList } from "@/features/editor/components/workflow-variables-panel";
import type { WorkflowVariableGroup } from "@/features/editor/lib/workflow-variables";
import { getGoogleDocsVariables } from "@/features/editor/lib/workflow-variables";
import { HelpCircle, Info } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Alert, AlertDescription } from "@/components/ui/alert";

// =============================================================================
// Schema
// =============================================================================

const formSchema = z.object({
  variableName: z
    .string()
    .min(1, { message: "Variable name is required" })
    .regex(/^[A-Za-z_$][A-Za-z0-9_$]*$/, {
      message:
        "Variable name must start with a letter or underscore and contain only letters, numbers, and underscores",
    }),
  credentialId: z.string().min(1, "Credential is required"),
  operation: z.enum(["get", "create", "append", "replace", "batchUpdate"]),
  documentId: z.string().optional(),
  title: z.string().optional(),
  content: z.string().optional(),
  findText: z.string().optional(),
  replaceText: z.string().optional(),
  requests: z.string().optional(),
});

export type GoogleDocsFormValues = z.infer<typeof formSchema>;

// =============================================================================
// Helpers
// =============================================================================

const OPERATION_INFO: Record<string, { label: string; description: string }> = {
  get: { label: "📖 Get Document", description: "Read a document's content and metadata" },
  create: { label: "➕ Create Document", description: "Create a new Google Doc" },
  append: { label: "📝 Append Text", description: "Add text to the end of a document" },
  replace: { label: "🔄 Find & Replace", description: "Replace text throughout a document" },
  batchUpdate: { label: "⚙️ Batch Update", description: "Advanced: Execute multiple API requests" },
};

// =============================================================================
// Component
// =============================================================================

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: GoogleDocsFormValues) => void;
  defaultValues?: Partial<GoogleDocsFormValues>;
  workflowVariables?: WorkflowVariableGroup[];
  currentNodeId?: string;
}

export const GoogleDocsDialog = ({
  open,
  onOpenChange,
  onSubmit,
  defaultValues = {},
  workflowVariables = [],
  currentNodeId,
}: Props) => {
  const dialogContentRef = useRef<HTMLDivElement>(null);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      variableName: defaultValues.variableName || "",
      credentialId: defaultValues.credentialId || "",
      operation: defaultValues.operation || "get",
      documentId: defaultValues.documentId || "",
      title: defaultValues.title || "",
      content: defaultValues.content || "",
      findText: defaultValues.findText || "",
      replaceText: defaultValues.replaceText || "",
      requests: defaultValues.requests || "",
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        variableName: defaultValues.variableName || "",
        credentialId: defaultValues.credentialId || "",
        operation: defaultValues.operation || "get",
        documentId: defaultValues.documentId || "",
        title: defaultValues.title || "",
        content: defaultValues.content || "",
        findText: defaultValues.findText || "",
        replaceText: defaultValues.replaceText || "",
        requests: defaultValues.requests || "",
      });
    }
  }, [open, defaultValues, form]);

  const watchVariableName = form.watch("variableName") || "googleDocs";
  const watchOperation = form.watch("operation");

  const handleSubmit = (values: GoogleDocsFormValues) => {
    onSubmit(values);
    onOpenChange(false);
  };

  // Fields needed based on operation
  const needsDocumentId = ["get", "append", "replace", "batchUpdate"].includes(watchOperation);
  const needsTitle = watchOperation === "create";
  const needsContent = ["create", "append"].includes(watchOperation);
  const needsFindReplace = watchOperation === "replace";
  const needsRequests = watchOperation === "batchUpdate";

  return (
    <ConfigurationPanelLayout
      open={open}
      onOpenChange={onOpenChange}
      workflowVariables={workflowVariables}
      currentNodeId={currentNodeId}
      dialogContentRef={dialogContentRef}
      className="max-w-2xl"
    >
      <ConfigDialogHeader>
        <ConfigDialogTitle className="flex items-center gap-2">
          <img src="/logos/google-docs.svg" alt="Google Docs" className="w-6 h-6" />
          Configure Google Docs Action
        </ConfigDialogTitle>
        <ConfigDialogDescription>
          Set up what this node should do with your documents.
        </ConfigDialogDescription>
      </ConfigDialogHeader>

      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(handleSubmit)}
          className="space-y-6 mt-4"
        >
          {/* Variable Name - First field for consistency */}
          <FormField
            control={form.control}
            name="variableName"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="flex items-center gap-2">
                  Output Variable Name
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <HelpCircle className="w-4 h-4 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs">
                        <p>Use this name to access the result in later nodes.</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </FormLabel>
                <FormControl>
                  <Input placeholder="googleDocs" {...field} />
                </FormControl>
                {watchVariableName && (
                  <div className="rounded-md border bg-muted/40 p-3 mt-2">
                    <p className="text-xs font-medium text-muted-foreground mb-2">
                      Available outputs (click to copy):
                    </p>
                    <VariableTokenList
                      variables={getGoogleDocsVariables(watchVariableName)}
                      emptyMessage=""
                    />
                  </div>
                )}
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Credential Selection */}
          <FormField
            control={form.control}
            name="credentialId"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="flex items-center gap-2">
                  Google Account
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <HelpCircle className="w-4 h-4 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs">
                        <p>Select which Google account to use. You can connect accounts in the Credentials page.</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </FormLabel>
                <FormControl>
                  <CredentialSelect
                    type={CredentialType.GOOGLE_DOCS}
                    value={field.value}
                    onChange={field.onChange}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Operation Selection */}
          <FormField
            control={form.control}
            name="operation"
            render={({ field }) => (
              <FormItem>
                <FormLabel>What do you want to do?</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  value={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select an operation" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {Object.entries(OPERATION_INFO).map(([key, info]) => (
                      <SelectItem key={key} value={key}>
                        {info.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormDescription>
                  {OPERATION_INFO[watchOperation]?.description}
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Document ID */}
          {needsDocumentId && (
            <FormField
              control={form.control}
              name="documentId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    Document ID
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <HelpCircle className="w-4 h-4 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent className="max-w-sm">
                          <p className="mb-2">Find the Document ID in the URL:</p>
                          <code className="text-xs bg-background/20 px-1 rounded block">
                            docs.google.com/document/d/<strong>DOCUMENT_ID</strong>/edit
                          </code>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder="1a2b3c4d5e6f7g8h9i0j..."
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Or use <code className="text-xs bg-muted px-1 rounded">{"{{previousNode.documentId}}"}</code> from a previous step
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          {/* Document Title - for create */}
          {needsTitle && (
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Document Title</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="My New Document"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Use <code className="text-xs bg-muted px-1 rounded">{"{{trigger.data.name}}"}</code> for dynamic titles
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          {/* Content - for create and append */}
          {needsContent && (
            <FormField
              control={form.control}
              name="content"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {watchOperation === "create" ? "Initial Content (Optional)" : "Content to Append"}
                  </FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder={
                        watchOperation === "create"
                          ? "Enter the initial content for the document..."
                          : "Enter the text to append..."
                      }
                      className="min-h-[120px]"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Use <code className="text-xs bg-muted px-1 rounded">{"{{previousNode.output}}"}</code> for dynamic content
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          {/* Find & Replace */}
          {needsFindReplace && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">🔄 Find & Replace</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="findText"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Find Text</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Text to find..."
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        This is case-sensitive
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="replaceText"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Replace With</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Replacement text..."
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        Use <code className="text-xs bg-muted px-1 rounded">{"{{trigger.data.value}}"}</code> for dynamic replacement
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>
          )}

          {/* Batch Update - Advanced */}
          {needsRequests && (
            <Accordion type="single" collapsible defaultValue="requests">
              <AccordionItem value="requests">
                <AccordionTrigger className="text-sm">
                  ⚙️ Batch Update Requests (Advanced)
                </AccordionTrigger>
                <AccordionContent className="space-y-4 pt-4">
                  <Alert>
                    <Info className="h-4 w-4" />
                    <AlertDescription>
                      This is for advanced users. You need to provide valid Google Docs API request objects.{" "}
                      <a
                        href="https://developers.google.com/docs/api/reference/rest/v1/documents/batchUpdate"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary underline"
                      >
                        See API documentation
                      </a>
                    </AlertDescription>
                  </Alert>
                  <FormField
                    control={form.control}
                    name="requests"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Requests JSON</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder={`[
  {
    "insertText": {
      "location": { "index": 1 },
      "text": "Hello World"
    }
  }
]`}
                            className="min-h-[180px] font-mono text-sm"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          )}

          <ConfigDialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">Save Configuration</Button>
          </ConfigDialogFooter>
        </form>
      </Form>
    </ConfigurationPanelLayout>
  );
};
