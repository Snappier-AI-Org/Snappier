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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { CredentialSelect } from "@/features/credentials/components/credential-select";
import {
  OPENAI_MODELS,
  getPricingTierLabel,
  getPricingTierColor,
} from "@/config/ai-models";
import {
  ConfigDialogDescription,
  ConfigDialogFooter,
  ConfigDialogHeader,
  ConfigDialogTitle,
  ConfigurationPanelLayout,
} from "@/features/editor/components/configuration-panel-layout";
import { VariableTokenList } from "@/features/editor/components/workflow-variables-panel";
import type { WorkflowVariableGroup } from "@/features/editor/lib/workflow-variables";
import { getAiVariables } from "@/features/editor/lib/workflow-variables";
import { CredentialType } from "@/generated/prisma";

const formSchema = z.object({
  variableName: z
    .string()
    .min(1, { message: "Variable name is required" })
    .regex(/^[A-Za-z_$][A-Za-z0-9_$]*$/, {
      message:
        "Variable name must start with a letter or underscore and container only letters, numbers, and underscores",
    }),
  credentialId: z.string().min(1, { message: "Credential is required" }),
  model: z.string().optional(),
  systemPrompt: z.string().optional(),
  userPrompt: z.string().min(1, "User prompt is required"),
});

export type OpenAiFormValues = z.infer<typeof formSchema>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: z.infer<typeof formSchema>) => void;
  defaultValues?: Partial<OpenAiFormValues>;
  workflowVariables?: WorkflowVariableGroup[];
  currentNodeId?: string;
}

export const OpenAiDialog = ({
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
      model: defaultValues.model || "gpt-4o-mini",
      systemPrompt: defaultValues.systemPrompt || "",
      userPrompt: defaultValues.userPrompt || "",
    },
  });
  // Reset form values when dialog opens with new defaults
  useEffect(() => {
    if (open) {
      form.reset({
        variableName: defaultValues.variableName || "",
        credentialId: defaultValues.credentialId || "",
        model: defaultValues.model || "gpt-4o-mini",
        systemPrompt: defaultValues.systemPrompt || "",
        userPrompt: defaultValues.userPrompt || "",
      });
    }
  }, [open, defaultValues, form]);

  const rawVariableName = form.watch("variableName");
  const trimmedVariableName = rawVariableName?.trim();
  const watchVariableName = trimmedVariableName || "myOpenAi";

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
        <ConfigDialogTitle>OpenAI Configuration</ConfigDialogTitle>
        <ConfigDialogDescription>
          Configure the AI model and prompts for this node.
        </ConfigDialogDescription>
      </ConfigDialogHeader>
      <div className="mt-4 flex flex-col gap-6">
        <div>
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(handleSubmit)}
              className="space-y-8"
            >
              <FormField
                control={form.control}
                name="variableName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Variable Name</FormLabel>
                    <FormControl>
                      <Input placeholder="myOpenAI" {...field} />
                    </FormControl>
                    <FormDescription>
                      Use this name to reference the result in other nodes:{" "}
                      {`{{${watchVariableName}.text}}`}
                    </FormDescription>
                    {trimmedVariableName ? (
                      <div className="rounded-md border bg-muted/40 p-3">
                        <p className="text-xs font-medium text-muted-foreground mb-2">
                          OpenAI outputs
                        </p>
                        <VariableTokenList
                          variables={getAiVariables(trimmedVariableName)}
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
                    <FormLabel>OpenAI Credential</FormLabel>
                    <FormControl>
                      <CredentialSelect
                        type={CredentialType.OPENAI}
                        value={field.value}
                        onChange={field.onChange}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="model"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Model</FormLabel>
                    <FormControl>
                      <Select
                        value={field.value || "gpt-4o-mini"}
                        onValueChange={field.onChange}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select a model" />
                        </SelectTrigger>
                        <SelectContent className="max-h-[280px]">
                          {OPENAI_MODELS.map((model) => (
                            <SelectItem key={model.id} value={model.id}>
                              <div className="flex items-center justify-between w-full gap-2">
                                <div className="flex flex-col items-start">
                                  <span className="font-medium">{model.name}</span>
                                  {model.description && (
                                    <span className="text-xs text-muted-foreground">
                                      {model.description}
                                    </span>
                                  )}
                                </div>
                                <Badge
                                  variant="outline"
                                  className={getPricingTierColor(model.pricingTier)}
                                >
                                  {getPricingTierLabel(model.pricingTier)}
                                </Badge>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormDescription>
                      Choose the OpenAI model to use for this node.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="systemPrompt"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>System Prompt (Optional)</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="You are a helpful assistant."
                        className="min-h-[80px] font-mono text-sm"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Sets the behavior of the assistant. Use{" "}
                      {`{{variables}}`}
                      for simple values or {`{{json variable}}`}
                      to stringify objects
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="userPrompt"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>User Prompt</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Summarize this text: {{json httpResponse}}"
                        className="min-h-[120px] font-mono text-sm"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      The main prompt sent to the AI model. Use{" "}
                      {`{{variables}}`} for simple values or{" "}
                      {`{{json variable}}`} to stringify objects.
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
        </div>
      </div>
    </ConfigurationPanelLayout>
  );
};
