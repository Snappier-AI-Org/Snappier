"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
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
import { Switch } from "@/components/ui/switch";
import { VariableTokenList } from "@/features/editor/components/workflow-variables-panel";
import type { WorkflowVariableGroup } from "@/features/editor/lib/workflow-variables";

// =============================================================================
// Schema
// =============================================================================

const formSchema = z.object({
  variableName: z
    .string()
    .min(1, { message: "Variable name is required" })
    .regex(/^[A-Za-z_$][A-Za-z0-9_$]*$/, {
      message:
        "Must start with a letter and contain only letters, numbers, and underscores",
    }),
  mode: z.enum(["forEach", "times"]),
  sourceArray: z.string(),
  iterations: z.number().min(1).max(10000),
  maxIterations: z.number().min(1).max(10000),
  collectResults: z.boolean(),
});

export type LoopFormValues = z.infer<typeof formSchema>;

// =============================================================================
// Component
// =============================================================================

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: LoopFormValues) => void;
  defaultValues?: Partial<LoopFormValues>;
  workflowVariables?: WorkflowVariableGroup[];
  currentNodeId?: string;
}

export const LoopDialog = ({
  open,
  onOpenChange,
  onSubmit,
  defaultValues = {},
  workflowVariables = [],
  currentNodeId,
}: Props) => {
  const form = useForm<LoopFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      variableName: defaultValues.variableName || "loop",
      mode: defaultValues.mode || "forEach",
      sourceArray: defaultValues.sourceArray || "",
      iterations: defaultValues.iterations ?? 5,
      maxIterations: defaultValues.maxIterations ?? 1000,
      collectResults: defaultValues.collectResults ?? true,
    },
  });

  const watchMode = form.watch("mode");
  const rawVariableName = form.watch("variableName");
  const trimmedVariableName = rawVariableName?.trim();
  const watchVariableName = trimmedVariableName || "loop";

  // Reset form when dialog opens with new default values
  useEffect(() => {
    if (open) {
      form.reset({
        variableName: defaultValues.variableName || "loop",
        mode: defaultValues.mode || "forEach",
        sourceArray: defaultValues.sourceArray || "",
        iterations: defaultValues.iterations ?? 5,
        maxIterations: defaultValues.maxIterations ?? 1000,
        collectResults: defaultValues.collectResults ?? true,
      });
    }
  }, [open, defaultValues, form]);

  const handleSubmit = (values: LoopFormValues) => {
    onSubmit(values);
    onOpenChange(false);
  };

  // Filter to only show variables from nodes that come before this one
  const availableVariables = workflowVariables.filter((group) => {
    if (!currentNodeId) return true;
    return group.nodeId !== currentNodeId;
  });

  // Define the output variables for the loop node
  const loopOutputVariables = trimmedVariableName
    ? [
        {
          token: `{{${trimmedVariableName}.currentItem}}`,
          label: "currentItem",
          description: "The current item being processed in the loop",
        },
        {
          token: `{{${trimmedVariableName}.currentIndex}}`,
          label: "currentIndex",
          description: "Zero-based index of the current iteration",
        },
        {
          token: `{{${trimmedVariableName}.totalItems}}`,
          label: "totalItems",
          description: "Total number of items in the loop",
        },
        {
          token: `{{${trimmedVariableName}.isFirst}}`,
          label: "isFirst",
          description: "Boolean indicating if this is the first iteration",
        },
        {
          token: `{{${trimmedVariableName}.isLast}}`,
          label: "isLast",
          description: "Boolean indicating if this is the last iteration",
        },
        {
          token: `{{${trimmedVariableName}.items}}`,
          label: "items",
          description: "The full array of items being looped over",
        },
      ]
    : [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Loop Configuration</DialogTitle>
          <DialogDescription>
            Configure the loop to iterate over arrays or repeat a specified
            number of times. Each iteration will execute all connected nodes.
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
                    <Input placeholder="loop" {...field} />
                  </FormControl>
                  <FormDescription>
                    Use this name to reference loop data in other nodes:{" "}
                    {`{{${watchVariableName}.currentItem}}`}
                  </FormDescription>
                  {trimmedVariableName ? (
                    <div className="rounded-md border bg-muted/40 p-3">
                      <p className="text-xs font-medium text-muted-foreground mb-2">
                        Loop outputs
                      </p>
                      <VariableTokenList
                        variables={loopOutputVariables}
                        emptyMessage=""
                      />
                    </div>
                  ) : null}
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Loop Mode */}
            <FormField
              control={form.control}
              name="mode"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Loop Mode</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select loop mode" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="forEach">
                        For Each - Iterate over an array
                      </SelectItem>
                      <SelectItem value="times">
                        Times - Repeat N times
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    {watchMode === "forEach"
                      ? "Loop through each item in an array"
                      : "Repeat the loop a fixed number of times"}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Source Array - shown for forEach mode */}
            {watchMode === "forEach" && (
              <FormField
                control={form.control}
                name="sourceArray"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Source Array</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="{{variableName.arrayProperty}}"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Reference to an array from a previous node (e.g.,{" "}
                      {`{{googleSheets.rows}}`}) or enter a JSON array directly
                    </FormDescription>
                    {availableVariables.length > 0 && (
                      <div className="rounded-md border bg-muted/40 p-3">
                        <p className="text-xs font-medium text-muted-foreground mb-2">
                          Available variables
                        </p>
                        <div className="space-y-2 max-h-[150px] overflow-y-auto">
                          {availableVariables.map((group) => (
                            <div key={group.nodeId}>
                              <p className="text-xs font-medium">
                                {group.nodeLabel}
                              </p>
                              <VariableTokenList
                                variables={group.variables}
                                emptyMessage=""
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Iterations - shown for times mode */}
            {watchMode === "times" && (
              <FormField
                control={form.control}
                name="iterations"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Number of Iterations</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={1}
                        max={10000}
                        placeholder="5"
                        value={field.value}
                        onChange={(e) => field.onChange(parseInt(e.target.value, 10) || 1)}
                      />
                    </FormControl>
                    <FormDescription>
                      How many times to repeat the loop (1-10,000)
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Max Iterations */}
            <FormField
              control={form.control}
              name="maxIterations"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Maximum Iterations</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={1}
                      max={10000}
                      placeholder="1000"
                      value={field.value}
                      onChange={(e) => field.onChange(parseInt(e.target.value, 10) || 1000)}
                    />
                  </FormControl>
                  <FormDescription>
                    Safety limit to prevent infinite loops (max 10,000)
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Collect Results */}
            <FormField
              control={form.control}
              name="collectResults"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                  <div className="space-y-0.5">
                    <FormLabel>Collect Results</FormLabel>
                    <FormDescription>
                      Store the output from each iteration in an array
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

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit">Save Configuration</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
