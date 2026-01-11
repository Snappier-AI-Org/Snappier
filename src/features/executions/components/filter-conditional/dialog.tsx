"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Trash2 } from "lucide-react";
import { useEffect } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import z from "zod";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { VariableTokenList } from "@/features/editor/components/workflow-variables-panel";
import type { WorkflowVariableGroup } from "@/features/editor/lib/workflow-variables";

// =============================================================================
// Schema
// =============================================================================

const OPERATORS = [
  { value: "equals", label: "Equals (=)", requiresValue: true },
  { value: "not_equals", label: "Not equals (≠)", requiresValue: true },
  { value: "contains", label: "Contains", requiresValue: true },
  { value: "not_contains", label: "Not contains", requiresValue: true },
  { value: "starts_with", label: "Starts with", requiresValue: true },
  { value: "ends_with", label: "Ends with", requiresValue: true },
  { value: "greater_than", label: "Greater than (>)", requiresValue: true },
  { value: "less_than", label: "Less than (<)", requiresValue: true },
  {
    value: "greater_than_or_equals",
    label: "Greater or equals (≥)",
    requiresValue: true,
  },
  {
    value: "less_than_or_equals",
    label: "Less or equals (≤)",
    requiresValue: true,
  },
  { value: "is_empty", label: "Is empty", requiresValue: false },
  { value: "is_not_empty", label: "Is not empty", requiresValue: false },
  { value: "is_true", label: "Is true", requiresValue: false },
  { value: "is_false", label: "Is false", requiresValue: false },
  { value: "regex_match", label: "Matches regex", requiresValue: true },
] as const;

const conditionSchema = z.object({
  field: z.string().min(1, "Field is required"),
  operator: z.enum([
    "equals",
    "not_equals",
    "contains",
    "not_contains",
    "starts_with",
    "ends_with",
    "greater_than",
    "less_than",
    "greater_than_or_equals",
    "less_than_or_equals",
    "is_empty",
    "is_not_empty",
    "is_true",
    "is_false",
    "regex_match",
  ]),
  value: z.string().optional(),
});

const formSchema = z.object({
  variableName: z
    .string()
    .min(1, { message: "Variable name is required" })
    .regex(/^[A-Za-z_$][A-Za-z0-9_$]*$/, {
      message:
        "Must start with a letter and contain only letters, numbers, and underscores",
    }),
  conditions: z
    .array(conditionSchema)
    .min(1, "At least one condition is required"),
  logicalOperator: z.enum(["AND", "OR"]),
});

export type FilterConditionalFormValues = z.infer<typeof formSchema>;

// =============================================================================
// Component
// =============================================================================

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: FilterConditionalFormValues) => void;
  defaultValues?: Partial<FilterConditionalFormValues>;
  workflowVariables?: WorkflowVariableGroup[];
  currentNodeId?: string;
}

export const FilterConditionalDialog = ({
  open,
  onOpenChange,
  onSubmit,
  defaultValues = {},
  workflowVariables = [],
  currentNodeId,
}: Props) => {
  const form = useForm<FilterConditionalFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      variableName: defaultValues.variableName || "",
      conditions: defaultValues.conditions?.length
        ? defaultValues.conditions
        : [{ field: "", operator: "equals", value: "" }],
      logicalOperator: defaultValues.logicalOperator || "AND",
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "conditions",
  });

  // Reset form when dialog opens with new default values
  useEffect(() => {
    if (open) {
      form.reset({
        variableName: defaultValues.variableName || "",
        conditions: defaultValues.conditions?.length
          ? defaultValues.conditions
          : [{ field: "", operator: "equals", value: "" }],
        logicalOperator: defaultValues.logicalOperator || "AND",
      });
    }
  }, [open, defaultValues, form]);

  const handleSubmit = (values: FilterConditionalFormValues) => {
    onSubmit(values);
    onOpenChange(false);
  };

  const watchedConditions = form.watch("conditions");
  const rawVariableName = form.watch("variableName");
  const trimmedVariableName = rawVariableName?.trim();
  const watchVariableName = trimmedVariableName || "filterResult";

  // Filter to only show variables from nodes that come before this one
  const availableVariables = workflowVariables.filter((group) => {
    if (!currentNodeId) return true;
    return group.nodeId !== currentNodeId;
  });

  // Define the output variables for the filter node
  const filterOutputVariables = trimmedVariableName
    ? [
        {
          token: `{{${trimmedVariableName}.result}}`,
          label: "result",
          description:
            "Boolean value (true/false) based on condition evaluation",
        },
        {
          token: `{{${trimmedVariableName}.conditions}}`,
          label: "conditions",
          description: "Array of evaluated conditions",
        },
        {
          token: `{{${trimmedVariableName}.matchType}}`,
          label: "matchType",
          description: "Logical operator used (AND/OR)",
        },
      ]
    : [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Filter / Conditional Configuration</DialogTitle>
          <DialogDescription>
            Define conditions to branch your workflow. Connect the green handle
            for true conditions and red for false.
          </DialogDescription>
        </DialogHeader>

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
                    <Input placeholder="filterResult" {...field} />
                  </FormControl>
                  <FormDescription>
                    Use this name to reference the result in other nodes:{" "}
                    {`{{${watchVariableName}.result}}`}
                  </FormDescription>
                  {trimmedVariableName ? (
                    <div className="rounded-md border bg-muted/40 p-3">
                      <p className="text-xs font-medium text-muted-foreground mb-2">
                        Filter outputs
                      </p>
                      <VariableTokenList
                        variables={filterOutputVariables}
                        emptyMessage=""
                      />
                    </div>
                  ) : null}
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Match Type */}
            <FormField
              control={form.control}
              name="logicalOperator"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Match Type</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select match type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="AND">
                        All conditions must match (AND)
                      </SelectItem>
                      <SelectItem value="OR">
                        Any condition must match (OR)
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Conditions */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <FormLabel>Conditions</FormLabel>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    append({ field: "", operator: "equals", value: "" })
                  }
                >
                  <Plus className="size-4 mr-1" />
                  Add
                </Button>
              </div>

              <div className="space-y-3">
                {fields.map((field, index) => {
                  const operator = watchedConditions[index]?.operator;
                  const operatorConfig = OPERATORS.find(
                    (op) => op.value === operator,
                  );
                  const requiresValue = operatorConfig?.requiresValue ?? true;

                  return (
                    <div
                      key={field.id}
                      className="flex gap-2 items-start p-3 border rounded-md bg-muted/30"
                    >
                      {/* Field */}
                      <FormField
                        control={form.control}
                        name={`conditions.${index}.field`}
                        render={({ field: formField }) => (
                          <FormItem className="flex-1">
                            <FormLabel className="text-xs">Field</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="{{variable.property}}"
                                className="font-mono text-sm"
                                {...formField}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {/* Operator */}
                      <FormField
                        control={form.control}
                        name={`conditions.${index}.operator`}
                        render={({ field: formField }) => (
                          <FormItem className="w-44">
                            <FormLabel className="text-xs">Operator</FormLabel>
                            <Select
                              onValueChange={formField.onChange}
                              value={formField.value}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {OPERATORS.map((op) => (
                                  <SelectItem key={op.value} value={op.value}>
                                    {op.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {/* Value */}
                      {requiresValue && (
                        <FormField
                          control={form.control}
                          name={`conditions.${index}.value`}
                          render={({ field: formField }) => (
                            <FormItem className="flex-1">
                              <FormLabel className="text-xs">Value</FormLabel>
                              <FormControl>
                                <Input
                                  placeholder="Value or {{variable}}"
                                  className="font-mono text-sm"
                                  {...formField}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      )}

                      {/* Delete Button */}
                      {fields.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="mt-6 shrink-0 text-muted-foreground hover:text-destructive"
                          onClick={() => remove(index)}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <DialogFooter>
              <Button type="submit">Save</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
