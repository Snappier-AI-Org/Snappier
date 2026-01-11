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
  recipientId: z.string().min(1, "Recipient ID is required"),
  messageContent: z
    .string()
    .min(1, "Message content is required")
    .max(1000, "Instagram DMs cannot exceed 1000 characters"),
});

export type InstagramDmFormValues = z.infer<typeof formSchema>;

function getInstagramDmVariables(variableName: string) {
  return [
    {
      token: `{{${variableName}.messageId}}`,
      label: "Message ID",
      description: "Unique ID of the sent message",
    },
    {
      token: `{{${variableName}.recipientId}}`,
      label: "Recipient ID",
      description: "ID of the message recipient",
    },
    {
      token: `{{${variableName}.messageContent}}`,
      label: "Message Content",
      description: "Content of the sent message",
    },
    {
      token: `{{${variableName}.status}}`,
      label: "Status",
      description: "Message delivery status",
    },
    {
      token: `{{${variableName}.timestamp}}`,
      label: "Timestamp",
      description: "When the message was sent",
    },
  ];
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: InstagramDmFormValues) => void;
  defaultValues?: Partial<InstagramDmFormValues>;
  workflowVariables?: WorkflowVariableGroup[];
  currentNodeId?: string;
}

export const InstagramDmDialog = ({
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
      recipientId: defaultValues.recipientId || "",
      messageContent: defaultValues.messageContent || "",
    },
  });

  // Reset form values when dialog opens with new defaults
  useEffect(() => {
    if (open) {
      form.reset({
        variableName: defaultValues.variableName || "",
        credentialId: defaultValues.credentialId || "",
        recipientId: defaultValues.recipientId || "",
        messageContent: defaultValues.messageContent || "",
      });
    }
  }, [open, defaultValues, form]);

  const watchVariableName = form.watch("variableName") || "instagramDmResult";

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
        <ConfigDialogTitle>Instagram DM Configuration</ConfigDialogTitle>
        <ConfigDialogDescription>
          Configure the Instagram DM settings for this node.
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
                  <Input placeholder="instagramDmResult" {...field} />
                </FormControl>
                <FormDescription>
                  Use this name to reference the result in other nodes:{" "}
                  {`{{${watchVariableName}.messageId}}`}
                </FormDescription>
                {watchVariableName ? (
                  <div className="rounded-md border bg-muted/40 p-3">
                    <p className="text-xs font-medium text-muted-foreground mb-2">
                      Instagram DM outputs
                    </p>
                    <VariableTokenList
                      variables={getInstagramDmVariables(watchVariableName)}
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
                  Select the Instagram account to send DMs from.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="recipientId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Recipient ID</FormLabel>
                <FormControl>
                  <Input
                    placeholder="{{instagramDM.senderId}} or Instagram user ID"
                    {...field}
                  />
                </FormControl>
                <FormDescription>
                  The Instagram user ID to send the DM to. Use{" "}
                  {`{{instagramDM.senderId}}`} to reply to the person who sent
                  you a DM.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="messageContent"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Message Content</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Hello! {{aiResponse.content}}"
                    className="min-h-[100px] font-mono text-sm"
                    {...field}
                  />
                </FormControl>
                <FormDescription>
                  The message to send. Use {"{{variables}}"} for dynamic content.
                  Max 1000 characters.
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

