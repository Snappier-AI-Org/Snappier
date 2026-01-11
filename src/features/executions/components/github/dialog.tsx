"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Trash2 } from "lucide-react";
import { useEffect, useRef } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import z from "zod";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { CredentialSelect } from "@/features/credentials/components/credential-select";
import {
  ConfigDialogDescription,
  ConfigDialogFooter,
  ConfigDialogHeader,
  ConfigDialogTitle,
  ConfigurationPanelLayout,
} from "@/features/editor/components/configuration-panel-layout";
import { VariableTokenList } from "@/features/editor/components/workflow-variables-panel";
import type { WorkflowVariableGroup } from "@/features/editor/lib/workflow-variables";
import { getGithubVariables } from "@/features/editor/lib/workflow-variables";
import { CredentialType } from "@/generated/prisma";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

// =============================================================================
// Schema
// =============================================================================

const labelSchema = z.object({
  name: z.string().min(1, "Label name is required"),
});

const formSchema = z.object({
  variableName: z
    .string()
    .min(1, { message: "Variable name is required" })
    .regex(/^[A-Za-z_$][A-Za-z0-9_$]*$/, {
      message:
        "Must start with a letter and contain only letters, numbers, and underscores",
    }),
  credentialId: z.string().min(1, "Please select a GitHub connection"),
  operation: z.enum([
    "list_repos",
    "get_repo",
    "list_issues",
    "get_issue",
    "create_issue",
    "update_issue",
    "close_issue",
    "list_pull_requests",
    "get_pull_request",
    "create_pull_request",
    "merge_pull_request",
    "list_branches",
    "get_file_content",
    "create_or_update_file",
  ]),
  // Repository info
  owner: z.string().optional(),
  repo: z.string().optional(),
  // Issue fields
  issueNumber: z.string().optional(),
  title: z.string().optional(),
  body: z.string().optional(),
  labels: z.array(labelSchema).optional(),
  assignees: z.string().optional(), // comma-separated
  state: z.enum(["open", "closed", "all"]).optional(),
  // PR fields
  prNumber: z.string().optional(),
  head: z.string().optional(), // source branch
  base: z.string().optional(), // target branch
  draft: z.boolean().optional(),
  // File fields
  path: z.string().optional(),
  branch: z.string().optional(),
  content: z.string().optional(),
  message: z.string().optional(), // commit message
  sha: z.string().optional(), // for updates
});

export type GithubFormValues = z.infer<typeof formSchema>;

// =============================================================================
// Helpers
// =============================================================================

const OPERATION_INFO: Record<string, { label: string; description: string }> = {
  list_repos: {
    label: "📂 List Repositories",
    description: "List repositories for the authenticated user",
  },
  get_repo: {
    label: "📁 Get Repository",
    description: "Get details of a specific repository",
  },
  list_issues: {
    label: "📋 List Issues",
    description: "List issues in a repository",
  },
  get_issue: {
    label: "🔍 Get Issue",
    description: "Get details of a specific issue",
  },
  create_issue: {
    label: "➕ Create Issue",
    description: "Create a new issue in a repository",
  },
  update_issue: {
    label: "✏️ Update Issue",
    description: "Update an existing issue",
  },
  close_issue: { label: "✅ Close Issue", description: "Close an issue" },
  list_pull_requests: {
    label: "🔄 List Pull Requests",
    description: "List pull requests in a repository",
  },
  get_pull_request: {
    label: "🔍 Get Pull Request",
    description: "Get details of a specific pull request",
  },
  create_pull_request: {
    label: "➕ Create Pull Request",
    description: "Create a new pull request",
  },
  merge_pull_request: {
    label: "🔀 Merge Pull Request",
    description: "Merge a pull request",
  },
  list_branches: {
    label: "🌿 List Branches",
    description: "List branches in a repository",
  },
  get_file_content: {
    label: "📄 Get File Content",
    description: "Get content of a file from a repository",
  },
  create_or_update_file: {
    label: "📝 Create/Update File",
    description: "Create or update a file in a repository",
  },
};

// =============================================================================
// Component
// =============================================================================

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: GithubFormValues) => void;
  defaultValues?: Partial<GithubFormValues>;
  workflowVariables?: WorkflowVariableGroup[];
  currentNodeId?: string;
}

export const GithubDialog = ({
  open,
  onOpenChange,
  onSubmit,
  defaultValues = {},
  workflowVariables = [],
  currentNodeId,
}: Props) => {
  const dialogContentRef = useRef<HTMLDivElement>(null);

  const form = useForm<GithubFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      variableName: defaultValues.variableName || "",
      credentialId: defaultValues.credentialId || "",
      operation: defaultValues.operation || "list_repos",
      owner: defaultValues.owner || "",
      repo: defaultValues.repo || "",
      issueNumber: defaultValues.issueNumber || "",
      title: defaultValues.title || "",
      body: defaultValues.body || "",
      labels: defaultValues.labels || [],
      assignees: defaultValues.assignees || "",
      state: defaultValues.state || "open",
      prNumber: defaultValues.prNumber || "",
      head: defaultValues.head || "",
      base: defaultValues.base || "",
      draft: defaultValues.draft || false,
      path: defaultValues.path || "",
      branch: defaultValues.branch || "",
      content: defaultValues.content || "",
      message: defaultValues.message || "",
      sha: defaultValues.sha || "",
    },
  });

  const {
    fields: labelFields,
    append: appendLabel,
    remove: removeLabel,
  } = useFieldArray({
    control: form.control,
    name: "labels",
  });

  useEffect(() => {
    if (open) {
      form.reset({
        variableName: defaultValues.variableName || "",
        credentialId: defaultValues.credentialId || "",
        operation: defaultValues.operation || "list_repos",
        owner: defaultValues.owner || "",
        repo: defaultValues.repo || "",
        issueNumber: defaultValues.issueNumber || "",
        title: defaultValues.title || "",
        body: defaultValues.body || "",
        labels: defaultValues.labels || [],
        assignees: defaultValues.assignees || "",
        state: defaultValues.state || "open",
        prNumber: defaultValues.prNumber || "",
        head: defaultValues.head || "",
        base: defaultValues.base || "",
        draft: defaultValues.draft || false,
        path: defaultValues.path || "",
        branch: defaultValues.branch || "",
        content: defaultValues.content || "",
        message: defaultValues.message || "",
        sha: defaultValues.sha || "",
      });
    }
  }, [open, defaultValues, form]);

  const rawVariableName = form.watch("variableName");
  const trimmedVariableName = rawVariableName?.trim();
  const watchVariableName = trimmedVariableName || "myGithub";
  const operation = form.watch("operation");

  const handleSubmit = (values: GithubFormValues) => {
    onSubmit(values);
    onOpenChange(false);
  };

  // Determine which fields to show based on operation
  const needsRepoInfo = [
    "get_repo",
    "list_issues",
    "get_issue",
    "create_issue",
    "update_issue",
    "close_issue",
    "list_pull_requests",
    "get_pull_request",
    "create_pull_request",
    "merge_pull_request",
    "list_branches",
    "get_file_content",
    "create_or_update_file",
  ].includes(operation);

  const needsIssueNumber = [
    "get_issue",
    "update_issue",
    "close_issue",
  ].includes(operation);
  const needsIssueFields = ["create_issue", "update_issue"].includes(operation);
  const needsPrNumber = ["get_pull_request", "merge_pull_request"].includes(
    operation,
  );
  const needsPrFields = ["create_pull_request"].includes(operation);
  const needsFileFields = [
    "get_file_content",
    "create_or_update_file",
  ].includes(operation);
  const needsState = ["list_issues", "list_pull_requests"].includes(operation);

  return (
    <ConfigurationPanelLayout
      open={open}
      onOpenChange={onOpenChange}
      workflowVariables={workflowVariables}
      currentNodeId={currentNodeId}
      dialogContentRef={dialogContentRef}
      className="max-w-5xl"
    >
      <ConfigDialogHeader>
        <ConfigDialogTitle>GitHub Configuration</ConfigDialogTitle>
        <ConfigDialogDescription>
          Configure the GitHub settings for this node.
        </ConfigDialogDescription>
      </ConfigDialogHeader>


        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="space-y-6"
          >
            {/* Variable Name */}
            <FormField
              control={form.control}
              name="variableName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Variable Name</FormLabel>
                  <FormControl>
                    <Input placeholder="myGithub" {...field} />
                  </FormControl>
                  <FormDescription>
                    Use this name to reference the result in other nodes:{" "}
                    {`{{${watchVariableName}.data}}`}
                  </FormDescription>
                  {trimmedVariableName && (
                    <div className="rounded-md border bg-muted/40 p-3">
                      <p className="text-xs font-medium text-muted-foreground mb-2">
                        GitHub outputs
                      </p>
                      <VariableTokenList
                        variables={getGithubVariables(trimmedVariableName)}
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
                  <FormLabel>GitHub Connection</FormLabel>
                  <FormControl>
                    <CredentialSelect
                      type={CredentialType.GITHUB}
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
                  <FormLabel>Operation</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
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
                    {OPERATION_INFO[operation]?.description}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Repository Info */}
            {needsRepoInfo && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Repository</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="owner"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Owner</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="username or organization"
                              {...field}
                            />
                          </FormControl>
                          <FormDescription>
                            Use {"{{variables}}"} to reference dynamic values
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="repo"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Repository</FormLabel>
                          <FormControl>
                            <Input placeholder="repository-name" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Issue Number */}
            {needsIssueNumber && (
              <FormField
                control={form.control}
                name="issueNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Issue Number</FormLabel>
                    <FormControl>
                      <Input placeholder="123" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Issue Fields */}
            {needsIssueFields && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Issue Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Title</FormLabel>
                        <FormControl>
                          <Input placeholder="Issue title" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="body"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Body</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Issue description..."
                            className="min-h-[100px]"
                            {...field}
                          />
                        </FormControl>
                        <FormDescription>
                          Use {"{{variables}}"} to include dynamic content
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="assignees"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Assignees (Optional)</FormLabel>
                        <FormControl>
                          <Input placeholder="user1, user2" {...field} />
                        </FormControl>
                        <FormDescription>
                          Comma-separated list of GitHub usernames
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  {/* Labels */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <FormLabel>Labels (Optional)</FormLabel>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => appendLabel({ name: "" })}
                      >
                        <Plus className="h-4 w-4 mr-1" /> Add Label
                      </Button>
                    </div>
                    {labelFields.map((field, index) => (
                      <div
                        key={field.id}
                        className="flex items-center gap-2 mb-2"
                      >
                        <Input
                          placeholder="Label name"
                          {...form.register(`labels.${index}.name`)}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeLabel(index)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* State filter for list operations */}
            {needsState && (
              <FormField
                control={form.control}
                name="state"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>State Filter</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="open">Open</SelectItem>
                        <SelectItem value="closed">Closed</SelectItem>
                        <SelectItem value="all">All</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* PR Number */}
            {needsPrNumber && (
              <FormField
                control={form.control}
                name="prNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Pull Request Number</FormLabel>
                    <FormControl>
                      <Input placeholder="123" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* PR Fields */}
            {needsPrFields && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">
                    Pull Request Details
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Title</FormLabel>
                        <FormControl>
                          <Input placeholder="PR title" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="body"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Body (Optional)</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="PR description..."
                            className="min-h-[100px]"
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
                      name="head"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Source Branch (head)</FormLabel>
                          <FormControl>
                            <Input placeholder="feature-branch" {...field} />
                          </FormControl>
                          <FormDescription>
                            The branch containing your changes
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="base"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Target Branch (base)</FormLabel>
                          <FormControl>
                            <Input placeholder="main" {...field} />
                          </FormControl>
                          <FormDescription>
                            The branch to merge into
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </CardContent>
              </Card>
            )}

            {/* File Fields */}
            {needsFileFields && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">File Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="path"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>File Path</FormLabel>
                        <FormControl>
                          <Input placeholder="src/index.ts" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="branch"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Branch (Optional)</FormLabel>
                        <FormControl>
                          <Input placeholder="main" {...field} />
                        </FormControl>
                        <FormDescription>
                          Defaults to the repository's default branch
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  {operation === "create_or_update_file" && (
                    <>
                      <FormField
                        control={form.control}
                        name="content"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Content</FormLabel>
                            <FormControl>
                              <Textarea
                                placeholder="File content..."
                                className="min-h-[150px] font-mono text-sm"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="message"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Commit Message</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="Update file via workflow"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="sha"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>SHA (for updates)</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="Leave empty for new files"
                                {...field}
                              />
                            </FormControl>
                            <FormDescription>
                              Required when updating an existing file. Get this
                              from a previous Get File Content operation.
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </>
                  )}
                </CardContent>
              </Card>
            )}

            <ConfigDialogFooter>
              <Button type="submit">Save</Button>
            </ConfigDialogFooter>
          </form>
        </Form>
    </ConfigurationPanelLayout>
  );
};
