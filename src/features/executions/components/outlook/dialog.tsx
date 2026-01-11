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
import { getOutlookVariables } from "@/features/editor/lib/workflow-variables";

const formSchema = z.object({
  variableName: z
    .string()
    .min(1, { message: "Variable name is required" })
    .regex(/^[A-Za-z_$][A-Za-z0-9_$]*$/, {
      message:
        "Variable name must start with a letter or underscore and contain only letters, numbers, and underscores",
    }),
  credentialId: z.string().min(1, "Credential is required"),
  operation: z.enum([
    "send_email",
    "read_emails", 
    "search_emails",
    "get_email",
    "delete_email",
    "reply_email",
    "forward_email",
    "mark_as_read",
  ]),
  to: z.string().optional(),
  cc: z.string().optional(),
  bcc: z.string().optional(),
  subject: z.string().optional(),
  body: z.string().optional(),
  isHtml: z.boolean().optional(),
  messageId: z.string().optional(),
  query: z.string().optional(),
  maxResults: z.string().optional(),
  forwardTo: z.string().optional(),
  markAsRead: z.boolean().optional(),
});

export type OutlookFormValues = z.infer<typeof formSchema>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: OutlookFormValues) => void;
  defaultValues?: Partial<OutlookFormValues>;
  workflowVariables?: WorkflowVariableGroup[];
  currentNodeId?: string;
}

export const OutlookDialog = ({
  open,
  onOpenChange,
  onSubmit,
  defaultValues = {},
  workflowVariables = [],
  currentNodeId,
}: Props) => {
  const dialogContentRef = useRef<HTMLDivElement>(null);

  // Using type assertion due to react-hook-form/zod type compatibility issues
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema) as any,
    defaultValues: {
      variableName: defaultValues.variableName || "",
      credentialId: defaultValues.credentialId || "",
      operation: defaultValues.operation || "read_emails",
      to: defaultValues.to || "",
      cc: defaultValues.cc || "",
      bcc: defaultValues.bcc || "",
      subject: defaultValues.subject || "",
      body: defaultValues.body || "",
      isHtml: defaultValues.isHtml || false,
      messageId: defaultValues.messageId || "",
      query: defaultValues.query || "",
      maxResults: String(defaultValues.maxResults || 10),
      forwardTo: defaultValues.forwardTo || "",
      markAsRead: defaultValues.markAsRead !== false,
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        variableName: defaultValues.variableName || "",
        credentialId: defaultValues.credentialId || "",
        operation: defaultValues.operation || "read_emails",
        to: defaultValues.to || "",
        cc: defaultValues.cc || "",
        bcc: defaultValues.bcc || "",
        subject: defaultValues.subject || "",
        body: defaultValues.body || "",
        isHtml: defaultValues.isHtml || false,
        messageId: defaultValues.messageId || "",
        query: defaultValues.query || "",
        maxResults: String(defaultValues.maxResults || 10),
        forwardTo: defaultValues.forwardTo || "",
        markAsRead: defaultValues.markAsRead !== false,
      });
    }
  }, [open, defaultValues, form]);

  const watchVariableName = form.watch("variableName") || "myOutlook";
  const watchOperation = form.watch("operation");

  const handleSubmit = (values: OutlookFormValues) => {
    onSubmit(values);
    onOpenChange(false);
  };

  const getOperationDescription = () => {
    switch (watchOperation) {
      case "read_emails":
        return `{{${watchVariableName}.messages}}`;
      case "search_emails":
        return `{{${watchVariableName}.messages}}`;
      case "get_email":
        return `{{${watchVariableName}.message}}`;
      case "send_email":
        return `{{${watchVariableName}.sent}}`;
      case "reply_email":
        return `{{${watchVariableName}.reply}}`;
      case "forward_email":
        return `{{${watchVariableName}.forwarded}}`;
      case "delete_email":
        return `{{${watchVariableName}.deleted}}`;
      case "mark_as_read":
        return `{{${watchVariableName}.updated}}`;
      default:
        return `{{${watchVariableName}.result}}`;
    }
  };

  // Fields needed based on operation
  const needsTo = watchOperation === "send_email";
  const needsCcBcc = watchOperation === "send_email";
  const needsSubjectBody = watchOperation === "send_email";
  const needsBody = ["send_email", "reply_email", "forward_email"].includes(watchOperation);
  const needsMessageId = ["get_email", "delete_email", "reply_email", "forward_email", "mark_as_read"].includes(watchOperation);
  const needsQuery = ["read_emails", "search_emails"].includes(watchOperation);
  const needsMaxResults = ["read_emails", "search_emails"].includes(watchOperation);
  const needsForwardTo = watchOperation === "forward_email";
  const needsMarkAsRead = watchOperation === "mark_as_read";

  return (
    <ConfigurationPanelLayout
      open={open}
      onOpenChange={onOpenChange}
      workflowVariables={workflowVariables}
      currentNodeId={currentNodeId}
      dialogContentRef={dialogContentRef}
      className="max-w-4xl"
    >
      <ConfigDialogHeader>
        <ConfigDialogTitle>Outlook Configuration</ConfigDialogTitle>
        <ConfigDialogDescription>
          Configure the Outlook email settings for this node.
        </ConfigDialogDescription>
      </ConfigDialogHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="space-y-6 mt-4"
          >
            <FormField
              control={form.control}
              name="variableName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Variable Name</FormLabel>
                  <FormControl>
                    <Input placeholder="myOutlook" {...field} />
                  </FormControl>
                  <FormDescription>
                    Use this name to reference the result in other nodes:{" "}
                    {getOperationDescription()}
                  </FormDescription>
                  {watchVariableName ? (
                    <div className="rounded-md border bg-muted/40 p-3">
                      <p className="text-xs font-medium text-muted-foreground mb-2">
                        Outlook outputs
                      </p>
                      <VariableTokenList
                        variables={getOutlookVariables(watchVariableName)}
                        emptyMessage=""
                      />
                    </div>
                  ) : null}
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="credentialId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Outlook Credential</FormLabel>
                  <FormControl>
                    <CredentialSelect
                      type={CredentialType.OUTLOOK}
                      value={field.value}
                      onChange={field.onChange}
                    />
                  </FormControl>
                  <FormDescription>
                    Select an Outlook credential.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="operation"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Operation</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select an operation" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="read_emails">Read Emails</SelectItem>
                      <SelectItem value="search_emails">Search Emails</SelectItem>
                      <SelectItem value="get_email">Get Email</SelectItem>
                      <SelectItem value="send_email">Send Email</SelectItem>
                      <SelectItem value="reply_email">Reply to Email</SelectItem>
                      <SelectItem value="forward_email">Forward Email</SelectItem>
                      <SelectItem value="delete_email">Delete Email</SelectItem>
                      <SelectItem value="mark_as_read">Mark as Read/Unread</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

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
                      Email recipient(s). Separate multiple with commas. Supports Handlebars: {"{{previousNode.email}}"}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* CC and BCC fields */}
            {needsCcBcc && (
              <>
                <FormField
                  control={form.control}
                  name="cc"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>CC (optional)</FormLabel>
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
                      <FormLabel>BCC (optional)</FormLabel>
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
              </>
            )}

            {/* Subject field */}
            {needsSubjectBody && (
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
                    <FormDescription>
                      Supports Handlebars: {"{{previousNode.title}}"}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Body field */}
            {needsBody && (
              <>
                <FormField
                  control={form.control}
                  name="body"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Body</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Email body content"
                          className="min-h-[100px]"
                          {...field} 
                        />
                      </FormControl>
                      <FormDescription>
                        Supports Handlebars: {"{{previousNode.content}}"}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                {watchOperation === "send_email" && (
                  <FormField
                    control={form.control}
                    name="isHtml"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">HTML Email</FormLabel>
                          <FormDescription>
                            Send the body as HTML instead of plain text
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
                )}
              </>
            )}

            {/* Message ID field */}
            {needsMessageId && (
              <FormField
                control={form.control}
                name="messageId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Message ID</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Enter message ID" 
                        {...field} 
                      />
                    </FormControl>
                    <FormDescription>
                      The Outlook message ID. Use {"{{previousNode.message.id}}"} from a previous step.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Forward To field */}
            {needsForwardTo && (
              <FormField
                control={form.control}
                name="forwardTo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Forward To</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="forward@example.com" 
                        {...field} 
                      />
                    </FormControl>
                    <FormDescription>
                      Email address(es) to forward to. Separate multiple with commas.
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
                    <FormLabel>Search Query {watchOperation === "read_emails" ? "(optional)" : ""}</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="from:example@outlook.com subject:invoice" 
                        {...field} 
                      />
                    </FormControl>
                    <FormDescription>
                      Search query to filter emails. Examples: &quot;from:name@example.com&quot;, &quot;subject:invoice&quot;
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
                      Maximum number of emails to return (1-999)
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Mark as Read toggle */}
            {needsMarkAsRead && (
              <FormField
                control={form.control}
                name="markAsRead"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Mark as Read</FormLabel>
                      <FormDescription>
                        Turn off to mark the email as unread instead
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
            )}

            <ConfigDialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit">Save</Button>
            </ConfigDialogFooter>
          </form>
        </Form>
    </ConfigurationPanelLayout>
  );
};
