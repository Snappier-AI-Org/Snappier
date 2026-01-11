"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import z from "zod";
import { Button } from "@/components/ui/button";
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
  ConfigDialogDescription,
  ConfigDialogFooter,
  ConfigDialogHeader,
  ConfigDialogTitle,
  ConfigurationPanelLayout,
} from "@/features/editor/components/configuration-panel-layout";
import { VariableTokenList } from "@/features/editor/components/workflow-variables-panel";
import type { WorkflowVariableGroup } from "@/features/editor/lib/workflow-variables";
import { CredentialSelect } from "@/features/credentials/components/credential-select";
import { CredentialType } from "@/generated/prisma";

const formSchema = z.object({
  variableName: z
    .string()
    .min(1, { message: "Variable name is required" })
    .regex(/^[A-Za-z_$][A-Za-z0-9_$]*$/, {
      message:
        "Variable name must start with a letter or underscore and contain only letters, numbers, and underscores",
    }),
  credentialId: z.string().min(1, "Instagram credential is required"),
  commentId: z.string().min(1, "Comment ID is required"),
  replyText: z
    .string()
    .min(1, "Reply text is required")
    .max(300, "Instagram comment replies cannot exceed 300 characters"),
});

export type InstagramCommentReplyFormValues = z.infer<typeof formSchema>;

function getInstagramCommentReplyVariables(variableName: string) {
  return [
    {
      token: `{{${variableName}.replyId}}`,
      label: "Reply ID",
      description: "Unique ID of the posted reply",
    },
    {
      token: `{{${variableName}.commentId}}`,
      label: "Comment ID",
      description: "ID of the original comment",
    },
    {
      token: `{{${variableName}.replyText}}`,
      label: "Reply Text",
      description: "Content of the reply",
    },
    {
      token: `{{${variableName}.status}}`,
      label: "Status",
      description: "Reply posting status",
    },
    {
      token: `{{${variableName}.timestamp}}`,
      label: "Timestamp",
      description: "When the reply was posted",
    },
  ];
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: InstagramCommentReplyFormValues) => void;
  defaultValues?: Partial<InstagramCommentReplyFormValues>;
  workflowVariables?: WorkflowVariableGroup[];
  currentNodeId?: string;
}

export const InstagramCommentReplyDialog = ({
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
      commentId: defaultValues.commentId || "",
      replyText: defaultValues.replyText || "",
    },
  });

  // Reset form values when dialog opens with new defaults
  useEffect(() => {
    if (open) {
      form.reset({
        variableName: defaultValues.variableName || "",
        credentialId: defaultValues.credentialId || "",
        commentId: defaultValues.commentId || "",
        replyText: defaultValues.replyText || "",
      });
    }
  }, [open, defaultValues, form]);

  const watchVariableName = form.watch("variableName") || "commentReplyResult";

  const handleSubmit = (values: z.infer<typeof formSchema>) => {
    onSubmit(values);
    onOpenChange(false);
  };

  return (
    <ConfigurationPanelLayout
      open={open}
      onOpenChange={onOpenChange}
      workflowVariables={workflowVariables}
      currentNodeId={currentNodeId}
      dialogContentRef={dialogContentRef}
    >
      <ConfigDialogHeader>
        <ConfigDialogTitle>Instagram Comment Reply Configuration</ConfigDialogTitle>
        <ConfigDialogDescription>
          Configure the Instagram comment reply settings for this node.
        </ConfigDialogDescription>
      </ConfigDialogHeader>
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(handleSubmit)}
          className="space-y-8 mt-4"
        >
          <FormField
            control={form.control}
            name="variableName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Variable Name</FormLabel>
                <FormControl>
                  <Input placeholder="commentReplyResult" {...field} />
                </FormControl>
                <FormDescription>
                  Use this name to reference the result in other nodes:{" "}
                  {`{{${watchVariableName}.replyId}}`}
                </FormDescription>
                {watchVariableName ? (
                  <div className="rounded-md border bg-muted/40 p-3">
                    <p className="text-xs font-medium text-muted-foreground mb-2">
                      Comment Reply outputs
                    </p>
                    <VariableTokenList
                      variables={getInstagramCommentReplyVariables(watchVariableName)}
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
                <FormLabel>Instagram Account</FormLabel>
                <FormControl>
                  <CredentialSelect
                    type={CredentialType.META_INSTAGRAM}
                    value={field.value}
                    onChange={field.onChange}
                    placeholder="Select an Instagram account"
                  />
                </FormControl>
                <FormDescription>
                  Select the Instagram account to reply from.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="commentId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Comment ID</FormLabel>
                <FormControl>
                  <Input
                    placeholder="{{instagramComment.commentId}} or comment ID"
                    {...field}
                  />
                </FormControl>
                <FormDescription>
                  The ID of the comment to reply to. Use{" "}
                  {`{{instagramComment.commentId}}`} to reply to the comment that
                  triggered the workflow.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="replyText"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Reply Text</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Thanks for your comment! {{aiResponse.content}}"
                    className="min-h-[100px] font-mono text-sm"
                    {...field}
                  />
                </FormControl>
                <FormDescription>
                  The reply to post. Use {"{{variables}}"} for dynamic content.
                  Max 300 characters.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <ConfigDialogFooter className="mt-4">
            <Button type="submit">Save</Button>
          </ConfigDialogFooter>
        </form>
      </Form>
    </ConfigurationPanelLayout>
  );
};

