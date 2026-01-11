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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { getTelegramVariables } from "@/features/editor/lib/workflow-variables";

const formSchema = z.object({
  variableName: z
    .string()
    .min(1, { message: "Variable name is required" })
    .regex(/^[A-Za-z_$][A-Za-z0-9_$]*$/, {
      message:
        "Variable name must start with a letter or underscore and contain only letters, numbers, and underscores",
    }),
  botToken: z.string().min(1, "Bot token is required"),
  chatId: z.string().min(1, "Chat ID is required"),
  content: z
    .string()
    .min(1, "Message content is required")
    .max(4096, "Telegram messages cannot exceed 4096 characters"),
  parseMode: z.enum(["HTML", "Markdown", "MarkdownV2", "None"]),
});

export type TelegramFormValues = z.infer<typeof formSchema>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: TelegramFormValues) => void;
  defaultValues?: Partial<TelegramFormValues>;
  workflowVariables?: WorkflowVariableGroup[];
  currentNodeId?: string;
}

export const TelegramDialog = ({
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
      botToken: defaultValues.botToken || "",
      chatId: defaultValues.chatId || "",
      content: defaultValues.content || "",
      parseMode: defaultValues.parseMode || "HTML",
    },
  });

  // Reset form values when dialog opens with new defaults
  useEffect(() => {
    if (open) {
      form.reset({
        variableName: defaultValues.variableName || "",
        botToken: defaultValues.botToken || "",
        chatId: defaultValues.chatId || "",
        content: defaultValues.content || "",
        parseMode: defaultValues.parseMode || "HTML",
      });
    }
  }, [open, defaultValues, form]);

  const watchVariableName = form.watch("variableName") || "myTelegram";

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
        <ConfigDialogTitle>Telegram Configuration</ConfigDialogTitle>
        <ConfigDialogDescription>
          Configure the Telegram bot settings for this node.
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
                  <Input placeholder="myTelegram" {...field} />
                </FormControl>
                <FormDescription>
                  Use this name to reference the result in other nodes:{" "}
                  {`{{${watchVariableName}.messageContent}}`}
                </FormDescription>
                {watchVariableName ? (
                  <div className="rounded-md border bg-muted/40 p-3">
                    <p className="text-xs font-medium text-muted-foreground mb-2">
                      Telegram outputs
                    </p>
                    <VariableTokenList
                      variables={getTelegramVariables(watchVariableName)}
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
            name="botToken"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Bot Token</FormLabel>
                <FormControl>
                  <Input
                    type="password"
                    placeholder="123456789:ABCdefGHIjklMNOpqrsTUVwxyz"
                    {...field}
                  />
                </FormControl>
                <FormDescription>
                  Get this from @BotFather on Telegram
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="chatId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Chat ID</FormLabel>
                <FormControl>
                  <Input
                    placeholder="123456789 or @channelusername"
                    {...field}
                  />
                </FormControl>
                <FormDescription>
                  The chat ID or username where to send the message. For private
                  chats: Get your user ID from @userinfobot, then send /start to
                  your bot first. For channels: Use @channelusername (with @)
                  For groups: Use the numeric group ID (usually negative, like
                  -1001234567890)
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
                    placeholder="Hello! Summary: {{MyGemini.text}}"
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
          <FormField
            control={form.control}
            name="parseMode"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Parse Mode</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select parse mode" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="HTML">HTML</SelectItem>
                    <SelectItem value="Markdown">Markdown</SelectItem>
                    <SelectItem value="MarkdownV2">MarkdownV2</SelectItem>
                    <SelectItem value="None">None (Plain Text)</SelectItem>
                  </SelectContent>
                </Select>
                <FormDescription>
                  How to parse the message. HTML is recommended for most use
                  cases.
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
