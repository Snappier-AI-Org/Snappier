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
import { Switch } from "@/components/ui/switch";
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
import { getGmailVariables } from "@/features/editor/lib/workflow-variables";
import { HelpCircle } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

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
  operation: z.enum(["list", "read", "send", "reply", "draft", "search", "delete", "label"]),
  to: z.string().optional(),
  cc: z.string().optional(),
  bcc: z.string().optional(),
  subject: z.string().optional(),
  body: z.string().optional(),
  isHtml: z.boolean().optional(),
  messageId: z.string().optional(),
  threadId: z.string().optional(),
  query: z.string().optional(),
  maxResults: z.string().optional(),
});

export type GmailFormValues = z.infer<typeof formSchema>;

// =============================================================================
// Helpers
// =============================================================================

const OPERATION_INFO: Record<string, { label: string; description: string }> = {
  list: { label: "📬 List Messages", description: "Get recent emails from your inbox" },
  read: { label: "📖 Read Message", description: "Read a specific email's content" },
  send: { label: "✉️ Send Email", description: "Send a new email" },
  reply: { label: "↩️ Reply to Email", description: "Reply to an existing email thread" },
  draft: { label: "📝 Create Draft", description: "Save an email as a draft" },
  search: { label: "🔍 Search Messages", description: "Search emails with Gmail filters" },
  delete: { label: "🗑️ Delete Message", description: "Delete an email" },
  label: { label: "🏷️ Add Labels", description: "Add labels to an email" },
};

// =============================================================================
// Component
// =============================================================================

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: GmailFormValues) => void;
  defaultValues?: Partial<GmailFormValues>;
  workflowVariables?: WorkflowVariableGroup[];
  currentNodeId?: string;
}

export const GmailDialog = ({
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
      operation: defaultValues.operation || "list",
      to: defaultValues.to || "",
      cc: defaultValues.cc || "",
      bcc: defaultValues.bcc || "",
      subject: defaultValues.subject || "",
      body: defaultValues.body || "",
      isHtml: defaultValues.isHtml || false,
      messageId: defaultValues.messageId || "",
      threadId: defaultValues.threadId || "",
      query: defaultValues.query || "",
      maxResults: String(defaultValues.maxResults || 10),
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        variableName: defaultValues.variableName || "",
        credentialId: defaultValues.credentialId || "",
        operation: defaultValues.operation || "list",
        to: defaultValues.to || "",
        cc: defaultValues.cc || "",
        bcc: defaultValues.bcc || "",
        subject: defaultValues.subject || "",
        body: defaultValues.body || "",
        isHtml: defaultValues.isHtml || false,
        messageId: defaultValues.messageId || "",
        threadId: defaultValues.threadId || "",
        query: defaultValues.query || "",
        maxResults: String(defaultValues.maxResults || 10),
      });
    }
  }, [open, defaultValues, form]);

  const watchVariableName = form.watch("variableName") || "myGmail";
  const watchOperation = form.watch("operation");

  const handleSubmit = (values: GmailFormValues) => {
    onSubmit(values);
    onOpenChange(false);
  };

  // Fields needed based on operation
  const needsTo = ["send", "reply", "draft"].includes(watchOperation);
  const needsCcBcc = ["send", "draft"].includes(watchOperation);
  const needsSubjectBody = ["send", "reply", "draft"].includes(watchOperation);
  const needsMessageId = ["read", "reply", "delete", "label"].includes(watchOperation);
  const needsThreadId = watchOperation === "reply";
  const needsQuery = ["list", "search"].includes(watchOperation);
  const needsMaxResults = ["list", "search"].includes(watchOperation);

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
          <img src="/logos/gmail.svg" alt="Gmail" className="w-6 h-6" />
          Configure Gmail Action
        </ConfigDialogTitle>
        <ConfigDialogDescription>
          Set up what this node should do with your emails.
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
                  <Input placeholder="myGmail" {...field} />
                </FormControl>
                {watchVariableName && (
                  <div className="rounded-md border bg-muted/40 p-3 mt-2">
                    <p className="text-xs font-medium text-muted-foreground mb-2">
                      Available outputs (click to copy):
                    </p>
                    <VariableTokenList
                      variables={getGmailVariables(watchVariableName)}
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
                  Gmail Account
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <HelpCircle className="w-4 h-4 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs">
                        <p>Select which Gmail account to use. You can connect accounts in the Credentials page.</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </FormLabel>
                <FormControl>
                  <CredentialSelect
                    type={CredentialType.GMAIL}
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

          {/* Email Composition Card */}
          {needsSubjectBody && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">✉️ Compose Email</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Recipient field */}
                {needsTo && (
                  <FormField
                    control={form.control}
                    name="to"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>To</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="recipient@example.com"
                            {...field}
                          />
                        </FormControl>
                        <FormDescription>
                          Use <code className="text-xs bg-muted px-1 rounded">{"{{trigger.email}}"}</code> for dynamic recipients
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                {/* CC and BCC fields */}
                {needsCcBcc && (
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="cc"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>CC (Optional)</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="cc@example.com"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="bcc"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>BCC (Optional)</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="bcc@example.com"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                )}

                <FormField
                  control={form.control}
                  name="subject"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Subject</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Email subject"
                          {...field}
                        />
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
                          placeholder="Email body content..."
                          className="min-h-[120px]"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        Use <code className="text-xs bg-muted px-1 rounded">{"{{previousNode.content}}"}</code> for dynamic content
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="isHtml"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                      <div className="space-y-0.5">
                        <FormLabel className="text-sm">HTML Email</FormLabel>
                        <FormDescription className="text-xs">
                          Send as HTML instead of plain text
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>
          )}

          {/* Message ID field */}
          {needsMessageId && (
            <FormField
              control={form.control}
              name="messageId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    Message ID
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <HelpCircle className="w-4 h-4 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent className="max-w-sm">
                          <p>The unique ID of the email. Get this from a List or Search operation.</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Use {{previousNode.message.id}}"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          {/* Thread ID field */}
          {needsThreadId && (
            <FormField
              control={form.control}
              name="threadId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Thread ID</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Use {{previousNode.message.threadId}}"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Required for replying to keep the email in the same thread.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          {/* Query field */}
          {needsQuery && (
            <FormField
              control={form.control}
              name="query"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Search Filter (Optional)</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="from:example@gmail.com is:unread"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Examples: <code className="text-xs bg-muted px-1 rounded">is:unread</code>, <code className="text-xs bg-muted px-1 rounded">from:name@example.com</code>, <code className="text-xs bg-muted px-1 rounded">subject:invoice</code>
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          {/* Max Results field */}
          {needsMaxResults && (
            <FormField
              control={form.control}
              name="maxResults"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Max Results</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      placeholder="10"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Maximum number of messages to return (1-500)
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
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
