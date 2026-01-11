"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
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

const formSchema = z.object({
  variableName: z.string().min(1, "Variable name is required"),
  mode: z.enum(["append", "combine", "multiplex", "chooseBranch"]),
  combineBy: z.enum(["position", "key"]).optional(),
  keyField: z.string().optional(),
  inputs: z.string().optional(), // Comma-separated list
});

type MergeFormInput = z.input<typeof formSchema>;
export type MergeFormValues = z.output<typeof formSchema>;

const DEFAULT_VALUES: MergeFormValues = {
  variableName: "merged",
  mode: "append",
};

interface MergeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: MergeFormValues) => void;
  defaultValues?: Partial<MergeFormValues>;
}

export function MergeDialog({
  open,
  onOpenChange,
  onSubmit,
  defaultValues,
}: MergeDialogProps) {
  const formDefaults = useMemo<MergeFormInput>(
    () => ({
      variableName: defaultValues?.variableName ?? DEFAULT_VALUES.variableName,
      mode: defaultValues?.mode ?? DEFAULT_VALUES.mode,
      combineBy: defaultValues?.combineBy,
      keyField: defaultValues?.keyField,
      inputs: Array.isArray(defaultValues?.inputs) ? defaultValues.inputs.join(", ") : "",
    }),
    [defaultValues],
  );

  const form = useForm<MergeFormInput, unknown, MergeFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: formDefaults,
  });

  const mode = form.watch("mode");

  useEffect(() => {
    if (open) {
      form.reset(formDefaults);
    }
  }, [open, form, formDefaults]);

  const handleDialogSubmit = form.handleSubmit((values) => {
    onSubmit(values);
    onOpenChange(false);
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Merge</DialogTitle>
          <DialogDescription>
            Combine data from multiple inputs.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form className="space-y-4" onSubmit={handleDialogSubmit}>
            <FormField
              control={form.control}
              name="variableName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Variable Name</FormLabel>
                  <FormControl>
                    <Input placeholder="merged" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="mode"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Mode</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="append">Append</SelectItem>
                      <SelectItem value="combine">Combine</SelectItem>
                      <SelectItem value="multiplex">Multiplex</SelectItem>
                      <SelectItem value="chooseBranch">Choose Branch</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    {mode === "append" && "Concatenate all items into one array"}
                    {mode === "combine" && "Merge objects by position or key"}
                    {mode === "multiplex" && "Create all combinations"}
                    {mode === "chooseBranch" && "Take first non-empty input"}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {mode === "combine" && (
              <>
                <FormField
                  control={form.control}
                  name="combineBy"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Combine By</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="position">Position</SelectItem>
                          <SelectItem value="key">Key Field</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="keyField"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Key Field</FormLabel>
                      <FormControl>
                        <Input placeholder="id" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </>
            )}

            <FormField
              control={form.control}
              name="inputs"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Input Variables</FormLabel>
                  <FormControl>
                    <Input placeholder="var1, var2, var3" {...field} />
                  </FormControl>
                  <FormDescription>
                    Comma-separated list of variable names to merge
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter className="gap-2">
              <Button variant="outline" type="button" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit">Save</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

