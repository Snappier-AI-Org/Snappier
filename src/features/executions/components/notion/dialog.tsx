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
import { useForm, useFieldArray } from "react-hook-form";
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
import { getNotionVariables } from "@/features/editor/lib/workflow-variables";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Trash2, Info, HelpCircle } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";

// =============================================================================
// Schema
// =============================================================================

const propertySchema = z.object({
  name: z.string().min(1, "Property name is required"),
  type: z.enum(["title", "rich_text", "select", "status", "date", "number", "checkbox", "url", "email", "phone"]),
  value: z.string(),
});

const contentBlockSchema = z.object({
  type: z.enum(["paragraph", "heading_1", "heading_2", "heading_3", "bulleted_list", "numbered_list", "to_do", "quote", "callout", "divider", "code"]),
  content: z.string().optional(),
  checked: z.boolean().optional(),
  language: z.string().optional(),
});

const formSchema = z.object({
  variableName: z
    .string()
    .min(1, { message: "Variable name is required" })
    .regex(/^[A-Za-z_$][A-Za-z0-9_$]*$/, {
      message: "Must start with a letter and contain only letters, numbers, and underscores",
    }),
  credentialId: z.string().min(1, "Please select a Notion connection"),
  operation: z.enum([
    "search",
    "get_page",
    "create_page",
    "update_page",
    "archive_page",
    "get_database",
    "query_database",
    "create_database_item",
    "update_database_item",
    "get_block_children",
    "append_block_children",
  ]),
  // Search
  query: z.string().optional(),
  // Page/Block IDs
  pageId: z.string().optional(),
  databaseId: z.string().optional(),
  blockId: z.string().optional(),
  // Create page parents
  parentType: z.enum(["page", "database"]).optional(),
  parentPageId: z.string().optional(),
  parentDatabaseId: z.string().optional(),
  // Page content
  title: z.string().optional(),
  // Friendly property builder
  properties: z.array(propertySchema).optional(),
  // Friendly content block builder
  contentBlocks: z.array(contentBlockSchema).optional(),
  // Query database
  filterProperty: z.string().optional(),
  filterType: z.enum(["equals", "does_not_equal", "contains", "does_not_contain", "is_empty", "is_not_empty"]).optional(),
  filterValue: z.string().optional(),
  sortProperty: z.string().optional(),
  sortDirection: z.enum(["ascending", "descending"]).optional(),
  // Advanced mode (raw JSON)
  useAdvancedMode: z.boolean().optional(),
  advancedProperties: z.string().optional(),
  advancedChildren: z.string().optional(),
  advancedFilter: z.string().optional(),
  advancedSorts: z.string().optional(),
});

export type NotionFormValues = z.infer<typeof formSchema>;

// =============================================================================
// Helpers
// =============================================================================

const OPERATION_INFO: Record<string, { label: string; description: string }> = {
  search: { label: "🔍 Search", description: "Find pages and databases by keyword" },
  get_page: { label: "📄 Get Page", description: "Retrieve a specific page by its ID" },
  create_page: { label: "➕ Create Page", description: "Create a new page in Notion" },
  update_page: { label: "✏️ Update Page", description: "Modify properties of an existing page" },
  archive_page: { label: "🗃️ Archive Page", description: "Move a page to trash" },
  get_database: { label: "🗄️ Get Database", description: "Retrieve database structure" },
  query_database: { label: "📊 Query Database", description: "Search within a database with filters" },
  create_database_item: { label: "➕ Add Database Row", description: "Add a new item to a database" },
  update_database_item: { label: "✏️ Update Database Row", description: "Modify an existing database item" },
  get_block_children: { label: "📑 Get Page Content", description: "Retrieve content blocks from a page" },
  append_block_children: { label: "📝 Add Content", description: "Append new content blocks to a page" },
};

const PROPERTY_TYPES = [
  { value: "title", label: "📝 Title", description: "Page title (required for database items)" },
  { value: "rich_text", label: "📄 Text", description: "Plain or rich text content" },
  { value: "select", label: "🔘 Select", description: "Single choice from options" },
  { value: "status", label: "🚦 Status", description: "Status like To Do, In Progress, Done" },
  { value: "date", label: "📅 Date", description: "Date or date range" },
  { value: "number", label: "🔢 Number", description: "Numeric value" },
  { value: "checkbox", label: "☑️ Checkbox", description: "True or false" },
  { value: "url", label: "🔗 URL", description: "Web link" },
  { value: "email", label: "📧 Email", description: "Email address" },
  { value: "phone", label: "📞 Phone", description: "Phone number" },
];

const BLOCK_TYPES = [
  { value: "paragraph", label: "📝 Paragraph", description: "Regular text" },
  { value: "heading_1", label: "H1", description: "Large heading" },
  { value: "heading_2", label: "H2", description: "Medium heading" },
  { value: "heading_3", label: "H3", description: "Small heading" },
  { value: "bulleted_list", label: "• List", description: "Bulleted list item" },
  { value: "numbered_list", label: "1. List", description: "Numbered list item" },
  { value: "to_do", label: "☑️ To-Do", description: "Checkbox item" },
  { value: "quote", label: "❝ Quote", description: "Quoted text" },
  { value: "callout", label: "💡 Callout", description: "Highlighted note" },
  { value: "divider", label: "— Divider", description: "Horizontal line" },
  { value: "code", label: "</> Code", description: "Code block" },
];

// =============================================================================
// Component
// =============================================================================

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: NotionFormValues) => void;
  defaultValues?: Partial<NotionFormValues>;
  workflowVariables?: WorkflowVariableGroup[];
  currentNodeId?: string;
}

export const NotionDialog = ({
  open,
  onOpenChange,
  onSubmit,
  defaultValues = {},
  workflowVariables = [],
  currentNodeId,
}: Props) => {
  const dialogContentRef = useRef<HTMLDivElement>(null);

  const form = useForm<NotionFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      variableName: defaultValues.variableName || "notion",
      credentialId: defaultValues.credentialId || "",
      operation: defaultValues.operation || "create_page",
      query: defaultValues.query || "",
      pageId: defaultValues.pageId || "",
      databaseId: defaultValues.databaseId || "",
      blockId: defaultValues.blockId || "",
      parentType: defaultValues.parentType || "database",
      parentPageId: defaultValues.parentPageId || "",
      parentDatabaseId: defaultValues.parentDatabaseId || "",
      title: defaultValues.title || "",
      properties: defaultValues.properties || [],
      contentBlocks: defaultValues.contentBlocks || [],
      filterProperty: defaultValues.filterProperty || "",
      filterType: defaultValues.filterType || "equals",
      filterValue: defaultValues.filterValue || "",
      sortProperty: defaultValues.sortProperty || "",
      sortDirection: defaultValues.sortDirection || "descending",
      useAdvancedMode: defaultValues.useAdvancedMode || false,
      advancedProperties: defaultValues.advancedProperties || "",
      advancedChildren: defaultValues.advancedChildren || "",
      advancedFilter: defaultValues.advancedFilter || "",
      advancedSorts: defaultValues.advancedSorts || "",
    },
  });

  const propertiesArray = useFieldArray({ control: form.control, name: "properties" });
  const contentBlocksArray = useFieldArray({ control: form.control, name: "contentBlocks" });

  useEffect(() => {
    if (open) {
      form.reset({
        variableName: defaultValues.variableName || "notion",
        credentialId: defaultValues.credentialId || "",
        operation: defaultValues.operation || "create_page",
        query: defaultValues.query || "",
        pageId: defaultValues.pageId || "",
        databaseId: defaultValues.databaseId || "",
        blockId: defaultValues.blockId || "",
        parentType: defaultValues.parentType || "database",
        parentPageId: defaultValues.parentPageId || "",
        parentDatabaseId: defaultValues.parentDatabaseId || "",
        title: defaultValues.title || "",
        properties: defaultValues.properties || [],
        contentBlocks: defaultValues.contentBlocks || [],
        filterProperty: defaultValues.filterProperty || "",
        filterType: defaultValues.filterType || "equals",
        filterValue: defaultValues.filterValue || "",
        sortProperty: defaultValues.sortProperty || "",
        sortDirection: defaultValues.sortDirection || "descending",
        useAdvancedMode: defaultValues.useAdvancedMode || false,
        advancedProperties: defaultValues.advancedProperties || "",
        advancedChildren: defaultValues.advancedChildren || "",
        advancedFilter: defaultValues.advancedFilter || "",
        advancedSorts: defaultValues.advancedSorts || "",
      });
    }
  }, [open, defaultValues, form]);

  const watchOperation = form.watch("operation");
  const watchParentType = form.watch("parentType");
  const watchVariableName = form.watch("variableName") || "notion";
  const watchUseAdvancedMode = form.watch("useAdvancedMode");

  const handleSubmit = (values: NotionFormValues) => {
    onSubmit(values);
    onOpenChange(false);
  };

  // Determine which fields to show based on operation
  const needsQuery = watchOperation === "search";
  const needsPageId = ["get_page", "update_page", "archive_page", "get_block_children", "append_block_children"].includes(watchOperation);
  const needsDatabaseId = ["get_database", "query_database", "create_database_item"].includes(watchOperation);
  const needsBlockId = watchOperation === "update_database_item";
  const needsParent = watchOperation === "create_page";
  const needsTitle = ["create_page", "create_database_item"].includes(watchOperation);
  const needsProperties = ["create_page", "update_page", "create_database_item", "update_database_item"].includes(watchOperation);
  const needsContent = ["create_page", "append_block_children"].includes(watchOperation);
  const needsFilter = watchOperation === "query_database";

  return (
    <ConfigurationPanelLayout
      open={open}
      onOpenChange={onOpenChange}
      workflowVariables={workflowVariables}
      currentNodeId={currentNodeId}
      dialogContentRef={dialogContentRef}
      className="max-w-3xl"
    >
      <ConfigDialogHeader>
        <ConfigDialogTitle className="flex items-center gap-2">
          <img src="/logos/notion.svg" alt="Notion" className="w-6 h-6" />
          Configure Notion Action
        </ConfigDialogTitle>
        <ConfigDialogDescription>
          Set up what this node should do in your Notion workspace.
        </ConfigDialogDescription>
      </ConfigDialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6 mt-4">
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
                          <p>Use this name to access the result in later nodes, like <code>{"{{notion.created.id}}"}</code></p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </FormLabel>
                  <FormControl>
                    <Input placeholder="myNotion" {...field} />
                  </FormControl>
                  {watchVariableName && (
                    <div className="rounded-md border bg-muted/40 p-3 mt-2">
                      <p className="text-xs font-medium text-muted-foreground mb-2">Available outputs:</p>
                      <VariableTokenList variables={getNotionVariables(watchVariableName)} emptyMessage="" />
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
                    Notion Account
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <HelpCircle className="w-4 h-4 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs">
                          <p>Select which Notion workspace to use. You can connect multiple accounts in the Credentials page.</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </FormLabel>
                  <FormControl>
                    <CredentialSelect
                      type={CredentialType.NOTION}
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
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="create_page">
                        <span className="flex items-center gap-2">➕ Create a new page</span>
                      </SelectItem>
                      <SelectItem value="create_database_item">
                        <span className="flex items-center gap-2">➕ Add item to database</span>
                      </SelectItem>
                      <SelectItem value="update_page">
                        <span className="flex items-center gap-2">✏️ Update a page</span>
                      </SelectItem>
                      <SelectItem value="append_block_children">
                        <span className="flex items-center gap-2">📝 Add content to page</span>
                      </SelectItem>
                      <SelectItem value="search">
                        <span className="flex items-center gap-2">🔍 Search Notion</span>
                      </SelectItem>
                      <SelectItem value="query_database">
                        <span className="flex items-center gap-2">📊 Query database</span>
                      </SelectItem>
                      <SelectItem value="get_page">
                        <span className="flex items-center gap-2">📄 Get page details</span>
                      </SelectItem>
                      <SelectItem value="get_database">
                        <span className="flex items-center gap-2">🗄️ Get database info</span>
                      </SelectItem>
                      <SelectItem value="archive_page">
                        <span className="flex items-center gap-2">🗃️ Archive page</span>
                      </SelectItem>
                      <SelectItem value="get_block_children">
                        <span className="flex items-center gap-2">📑 Get page content</span>
                      </SelectItem>
                      <SelectItem value="update_database_item">
                        <span className="flex items-center gap-2">✏️ Update database item</span>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    {OPERATION_INFO[watchOperation]?.description}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Search Query */}
            {needsQuery && (
              <FormField
                control={form.control}
                name="query"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Search for</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter keywords to search..." {...field} />
                    </FormControl>
                    <FormDescription>
                      Search across all pages and databases in your workspace
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Page ID Input */}
            {needsPageId && (
              <FormField
                control={form.control}
                name="pageId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      Page ID
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <HelpCircle className="w-4 h-4 text-muted-foreground" />
                          </TooltipTrigger>
                          <TooltipContent className="max-w-sm">
                            <p className="mb-2">Find the Page ID in the Notion URL:</p>
                            <code className="text-xs bg-background/20 px-1 rounded">
                              notion.so/Page-Title-<strong>abc123def456</strong>
                            </code>
                            <p className="mt-2 opacity-80">The ID is the long string at the end</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </FormLabel>
                    <FormControl>
                      <Input placeholder="Paste Page ID or use {{variable}}" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Database ID Input */}
            {needsDatabaseId && (
              <FormField
                control={form.control}
                name="databaseId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      Database ID
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <HelpCircle className="w-4 h-4 text-muted-foreground" />
                          </TooltipTrigger>
                          <TooltipContent className="max-w-sm">
                            <p className="mb-2">Find the Database ID in the Notion URL:</p>
                            <code className="text-xs bg-background/20 px-1 rounded">
                              notion.so/<strong>abc123def456</strong>?v=...
                            </code>
                            <p className="mt-2 opacity-80">The ID is the string before the ?v= part</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </FormLabel>
                    <FormControl>
                      <Input placeholder="Paste Database ID or use {{variable}}" {...field} />
                    </FormControl>
                    <Alert className="mt-2">
                      <Info className="h-4 w-4" />
                      <AlertDescription>
                        Make sure to share this database with your integration in Notion.
                        Open the database → ••• menu → Connections → Add your integration.
                      </AlertDescription>
                    </Alert>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Block ID for update_database_item */}
            {needsBlockId && (
              <FormField
                control={form.control}
                name="blockId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Database Item ID</FormLabel>
                    <FormControl>
                      <Input placeholder="Paste the item/row ID or use {{variable}}" {...field} />
                    </FormControl>
                    <FormDescription>
                      Use a page ID from a previous query or search result
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Parent Selection for Create Page */}
            {needsParent && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Where to create the page?</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="parentType"
                    render={({ field }) => (
                      <FormItem>
                        <div className="flex gap-4">
                          <label className={`flex-1 cursor-pointer rounded-lg border-2 p-4 transition-colors ${field.value === "database" ? "border-primary bg-primary/5" : "border-muted hover:border-muted-foreground/50"}`}>
                            <input
                              type="radio"
                              value="database"
                              checked={field.value === "database"}
                              onChange={() => field.onChange("database")}
                              className="sr-only"
                            />
                            <div className="flex flex-col gap-1">
                              <span className="font-medium">📊 In a Database</span>
                              <span className="text-sm text-muted-foreground">Add as a new row/item</span>
                            </div>
                          </label>
                          <label className={`flex-1 cursor-pointer rounded-lg border-2 p-4 transition-colors ${field.value === "page" ? "border-primary bg-primary/5" : "border-muted hover:border-muted-foreground/50"}`}>
                            <input
                              type="radio"
                              value="page"
                              checked={field.value === "page"}
                              onChange={() => field.onChange("page")}
                              className="sr-only"
                            />
                            <div className="flex flex-col gap-1">
                              <span className="font-medium">📄 Under a Page</span>
                              <span className="text-sm text-muted-foreground">Create as a subpage</span>
                            </div>
                          </label>
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {watchParentType === "database" && (
                    <FormField
                      control={form.control}
                      name="parentDatabaseId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Database ID</FormLabel>
                          <FormControl>
                            <Input placeholder="Paste the Database ID" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}

                  {watchParentType === "page" && (
                    <FormField
                      control={form.control}
                      name="parentPageId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Parent Page ID</FormLabel>
                          <FormControl>
                            <Input placeholder="Paste the Page ID" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}

                  <Alert>
                    <Info className="h-4 w-4" />
                    <AlertDescription>
                      The target page or database must be shared with your integration. In Notion, click ••• → Connections → Add your integration.
                    </AlertDescription>
                  </Alert>
                </CardContent>
              </Card>
            )}

            {/* Page Title */}
            {needsTitle && (
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Page Title</FormLabel>
                    <FormControl>
                      <Input placeholder="My New Page" {...field} />
                    </FormControl>
                    <FormDescription>
                      You can use variables like <code className="text-xs bg-muted px-1 rounded">{"{{trigger.data.name}}"}</code>
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Properties Builder */}
            {needsProperties && !watchUseAdvancedMode && (
              <Accordion type="single" collapsible defaultValue="properties">
                <AccordionItem value="properties">
                  <AccordionTrigger className="text-base font-medium">
                    📋 Properties
                    {propertiesArray.fields.length > 0 && (
                      <Badge variant="secondary" className="ml-2">{propertiesArray.fields.length}</Badge>
                    )}
                  </AccordionTrigger>
                  <AccordionContent className="space-y-4 pt-4">
                    {propertiesArray.fields.length === 0 && (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        No properties added yet. Click below to add properties.
                      </p>
                    )}

                    {propertiesArray.fields.map((field, index) => (
                      <Card key={field.id} className="relative">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="absolute top-2 right-2 h-8 w-8 text-muted-foreground hover:text-destructive"
                          onClick={() => propertiesArray.remove(index)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                        <CardContent className="pt-4 pb-4 pr-12 grid grid-cols-3 gap-3">
                          <FormField
                            control={form.control}
                            name={`properties.${index}.name`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-xs">Property Name</FormLabel>
                                <FormControl>
                                  <Input placeholder="e.g., Name, Status" {...field} />
                                </FormControl>
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name={`properties.${index}.type`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-xs">Type</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value}>
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    {PROPERTY_TYPES.map((pt) => (
                                      <SelectItem key={pt.value} value={pt.value}>
                                        {pt.label}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name={`properties.${index}.value`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-xs">Value</FormLabel>
                                <FormControl>
                                  <Input placeholder="Enter value..." {...field} />
                                </FormControl>
                              </FormItem>
                            )}
                          />
                        </CardContent>
                      </Card>
                    ))}

                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => propertiesArray.append({ name: "", type: "rich_text", value: "" })}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Property
                    </Button>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            )}

            {/* Content Blocks Builder */}
            {needsContent && !watchUseAdvancedMode && (
              <Accordion type="single" collapsible defaultValue="content">
                <AccordionItem value="content">
                  <AccordionTrigger className="text-base font-medium">
                    📝 Page Content
                    {contentBlocksArray.fields.length > 0 && (
                      <Badge variant="secondary" className="ml-2">{contentBlocksArray.fields.length}</Badge>
                    )}
                  </AccordionTrigger>
                  <AccordionContent className="space-y-4 pt-4">
                    {contentBlocksArray.fields.length === 0 && (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        No content blocks added. Click below to add text, headings, lists, etc.
                      </p>
                    )}

                    {contentBlocksArray.fields.map((field, index) => (
                      <Card key={field.id} className="relative">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="absolute top-2 right-2 h-8 w-8 text-muted-foreground hover:text-destructive"
                          onClick={() => contentBlocksArray.remove(index)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                        <CardContent className="pt-4 pb-4 pr-12 space-y-3">
                          <div className="grid grid-cols-2 gap-3">
                            <FormField
                              control={form.control}
                              name={`contentBlocks.${index}.type`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className="text-xs">Block Type</FormLabel>
                                  <Select onValueChange={field.onChange} value={field.value}>
                                    <FormControl>
                                      <SelectTrigger>
                                        <SelectValue />
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                      {BLOCK_TYPES.map((bt) => (
                                        <SelectItem key={bt.value} value={bt.value}>
                                          {bt.label} - {bt.description}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </FormItem>
                              )}
                            />
                            {form.watch(`contentBlocks.${index}.type`) === "to_do" && (
                              <FormField
                                control={form.control}
                                name={`contentBlocks.${index}.checked`}
                                render={({ field }) => (
                                  <FormItem className="flex items-end gap-2 pb-2">
                                    <FormControl>
                                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                                    </FormControl>
                                    <FormLabel className="text-xs">Checked</FormLabel>
                                  </FormItem>
                                )}
                              />
                            )}
                            {form.watch(`contentBlocks.${index}.type`) === "code" && (
                              <FormField
                                control={form.control}
                                name={`contentBlocks.${index}.language`}
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel className="text-xs">Language</FormLabel>
                                    <Select onValueChange={field.onChange} value={field.value || "plain text"}>
                                      <FormControl>
                                        <SelectTrigger>
                                          <SelectValue />
                                        </SelectTrigger>
                                      </FormControl>
                                      <SelectContent>
                                        <SelectItem value="plain text">Plain Text</SelectItem>
                                        <SelectItem value="javascript">JavaScript</SelectItem>
                                        <SelectItem value="typescript">TypeScript</SelectItem>
                                        <SelectItem value="python">Python</SelectItem>
                                        <SelectItem value="java">Java</SelectItem>
                                        <SelectItem value="html">HTML</SelectItem>
                                        <SelectItem value="css">CSS</SelectItem>
                                        <SelectItem value="sql">SQL</SelectItem>
                                        <SelectItem value="json">JSON</SelectItem>
                                        <SelectItem value="bash">Bash</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </FormItem>
                                )}
                              />
                            )}
                          </div>
                          {form.watch(`contentBlocks.${index}.type`) !== "divider" && (
                            <FormField
                              control={form.control}
                              name={`contentBlocks.${index}.content`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className="text-xs">Content</FormLabel>
                                  <FormControl>
                                    <Textarea
                                      placeholder="Enter text content..."
                                      className="min-h-[60px]"
                                      {...field}
                                    />
                                  </FormControl>
                                </FormItem>
                              )}
                            />
                          )}
                        </CardContent>
                      </Card>
                    ))}

                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => contentBlocksArray.append({ type: "paragraph", content: "" })}
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        Paragraph
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => contentBlocksArray.append({ type: "heading_2", content: "" })}
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        Heading
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => contentBlocksArray.append({ type: "bulleted_list", content: "" })}
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        Bullet
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => contentBlocksArray.append({ type: "to_do", content: "", checked: false })}
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        To-Do
                      </Button>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            )}

            {/* Query Database Filters */}
            {needsFilter && !watchUseAdvancedMode && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">🔍 Filter & Sort (Optional)</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-3 gap-3">
                    <FormField
                      control={form.control}
                      name="filterProperty"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">Filter by property</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g., Status" {...field} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="filterType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">Condition</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="equals">equals</SelectItem>
                              <SelectItem value="does_not_equal">does not equal</SelectItem>
                              <SelectItem value="contains">contains</SelectItem>
                              <SelectItem value="does_not_contain">does not contain</SelectItem>
                              <SelectItem value="is_empty">is empty</SelectItem>
                              <SelectItem value="is_not_empty">is not empty</SelectItem>
                            </SelectContent>
                          </Select>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="filterValue"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">Value</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g., Done" {...field} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <FormField
                      control={form.control}
                      name="sortProperty"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">Sort by property</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g., Created time" {...field} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="sortDirection"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">Direction</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="ascending">Ascending (A→Z, oldest first)</SelectItem>
                              <SelectItem value="descending">Descending (Z→A, newest first)</SelectItem>
                            </SelectContent>
                          </Select>
                        </FormItem>
                      )}
                    />
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Advanced Mode Toggle */}
            {(needsProperties || needsContent || needsFilter) && (
              <Accordion type="single" collapsible>
                <AccordionItem value="advanced">
                  <AccordionTrigger className="text-sm text-muted-foreground">
                    ⚙️ Advanced Mode (Raw JSON)
                  </AccordionTrigger>
                  <AccordionContent className="space-y-4 pt-4">
                    <Alert>
                      <Info className="h-4 w-4" />
                      <AlertDescription>
                        Use this if you need full control over Notion&apos;s API. Values here override the visual builders above.
                      </AlertDescription>
                    </Alert>

                    <FormField
                      control={form.control}
                      name="useAdvancedMode"
                      render={({ field }) => (
                        <FormItem className="flex items-center gap-2">
                          <FormControl>
                            <Switch checked={field.value} onCheckedChange={field.onChange} />
                          </FormControl>
                          <FormLabel className="mt-0!">Enable Advanced Mode</FormLabel>
                        </FormItem>
                      )}
                    />

                    {watchUseAdvancedMode && (
                      <>
                        {needsProperties && (
                          <FormField
                            control={form.control}
                            name="advancedProperties"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Properties JSON</FormLabel>
                                <FormControl>
                                  <Textarea
                                    className="font-mono text-sm min-h-[100px]"
                                    placeholder='{ "Name": { "title": [{ "text": { "content": "Page Title" } }] } }'
                                    {...field}
                                  />
                                </FormControl>
                              </FormItem>
                            )}
                          />
                        )}
                        {needsContent && (
                          <FormField
                            control={form.control}
                            name="advancedChildren"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Content Blocks JSON</FormLabel>
                                <FormControl>
                                  <Textarea
                                    className="font-mono text-sm min-h-[100px]"
                                    placeholder='[{ "object": "block", "type": "paragraph", "paragraph": { "rich_text": [...] } }]'
                                    {...field}
                                  />
                                </FormControl>
                              </FormItem>
                            )}
                          />
                        )}
                        {needsFilter && (
                          <>
                            <FormField
                              control={form.control}
                              name="advancedFilter"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Filter JSON</FormLabel>
                                  <FormControl>
                                    <Textarea
                                      className="font-mono text-sm min-h-[80px]"
                                      placeholder='{ "property": "Status", "select": { "equals": "Done" } }'
                                      {...field}
                                    />
                                  </FormControl>
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={form.control}
                              name="advancedSorts"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Sorts JSON</FormLabel>
                                  <FormControl>
                                    <Textarea
                                      className="font-mono text-sm min-h-[60px]"
                                      placeholder='[{ "property": "Created", "direction": "descending" }]'
                                      {...field}
                                    />
                                  </FormControl>
                                </FormItem>
                              )}
                            />
                          </>
                        )}
                      </>
                    )}
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
