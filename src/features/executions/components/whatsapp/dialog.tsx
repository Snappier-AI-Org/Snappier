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
import { getWhatsAppVariables } from "@/features/editor/lib/workflow-variables";

const formSchema = z.object({
  variableName: z
    .string()
    .min(1, { message: "Variable name is required" })
    .regex(/^[A-Za-z_$][A-Za-z0-9_$]*$/, {
      message:
        "Variable name must start with a letter or underscore and contain only letters, numbers, and underscores",
    }),
  phoneNumber: z.string().min(1, "Phone number is required"),
  content: z
    .string()
    .min(1, "Message content is required")
    .max(4096, "Messages cannot exceed 4096 characters"),
});

export type WhatsAppFormValues = z.infer<typeof formSchema>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: WhatsAppFormValues) => void;
  defaultValues?: Partial<WhatsAppFormValues>;
  workflowVariables?: WorkflowVariableGroup[];
  currentNodeId?: string;
}

export const WhatsAppDialog = ({
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
      phoneNumber: defaultValues.phoneNumber || "",
      content: defaultValues.content || "",
    },
  });

  // Reset form values when dialog opens with new defaults
  useEffect(() => {
    if (open) {
      form.reset({
        variableName: defaultValues.variableName || "",
        phoneNumber: defaultValues.phoneNumber || "",
        content: defaultValues.content || "",
      });
    }
  }, [open, defaultValues, form]);

  const watchVariableName = form.watch("variableName") || "myWhatsApp";

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
        <ConfigDialogTitle>WhatsApp Configuration</ConfigDialogTitle>
        <ConfigDialogDescription>
          Configure WhatsApp messaging for this node. Uses whatsapp-web.js library.
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
                  <Input placeholder="myWhatsApp" {...field} />
                </FormControl>
                <FormDescription>
                  Use this name to reference the result in other nodes:{" "}
                  {`{{${watchVariableName}.messageContent}}`}
                </FormDescription>
                {watchVariableName ? (
                  <div className="rounded-md border bg-muted/40 p-3">
                    <p className="text-xs font-medium text-muted-foreground mb-2">
                      WhatsApp outputs
                    </p>
                    <VariableTokenList
                      variables={getWhatsAppVariables(watchVariableName)}
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
            name="phoneNumber"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Phone Number</FormLabel>
                <FormControl>
                  <Input
                    placeholder="1234567890 (without + or country code prefix)"
                    {...field}
                  />
                </FormControl>
                <FormDescription>
                  The recipient&apos;s phone number with country code but without + or spaces. 
                  Example: 14155238886 for US number +1 (415) 523-8886
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="content"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Message Content</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Hello! Here's your summary: {{MyGemini.text}}"
                    className="min-h-[80px] font-mono text-sm"
                    {...field}
                  />
                </FormControl>
                <FormDescription>
                  The message to send. Use {"{{variables}}"} for simple values
                  or {"{{json variable}}"} to stringify objects
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
