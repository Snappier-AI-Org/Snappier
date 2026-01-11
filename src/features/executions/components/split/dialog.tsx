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
  mode: z.enum(["splitInBatches", "splitByField", "splitByDelimiter"]),
  batchSize: z.coerce.number().min(1).optional(),
  field: z.string().optional(),
  delimiter: z.string().optional(),
  inputVariable: z.string().optional(),
});

type SplitFormInput = z.input<typeof formSchema>;
export type SplitFormValues = z.output<typeof formSchema>;

const DEFAULT_VALUES: SplitFormValues = {
  variableName: "batches",
  mode: "splitInBatches",
  batchSize: 10,
};

interface SplitDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: SplitFormValues) => void;
  defaultValues?: Partial<SplitFormValues>;
}

export function SplitDialog({
  open,
  onOpenChange,
  onSubmit,
  defaultValues,
}: SplitDialogProps) {
  const formDefaults = useMemo<SplitFormInput>(
    () => ({
      variableName: defaultValues?.variableName ?? DEFAULT_VALUES.variableName,
      mode: defaultValues?.mode ?? DEFAULT_VALUES.mode,
      batchSize: defaultValues?.batchSize ?? DEFAULT_VALUES.batchSize,
      field: defaultValues?.field,
      delimiter: defaultValues?.delimiter,
      inputVariable: defaultValues?.inputVariable,
    }),
    [defaultValues],
  );

  const form = useForm<SplitFormInput, unknown, SplitFormValues>({
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
          <DialogTitle>Split</DialogTitle>
          <DialogDescription>
            Split data into multiple batches or groups.
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
                    <Input placeholder="batches" {...field} />
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
                      <SelectItem value="splitInBatches">Split in Batches</SelectItem>
                      <SelectItem value="splitByField">Split by Field</SelectItem>
                      <SelectItem value="splitByDelimiter">Split by Delimiter</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {mode === "splitInBatches" && (
              <FormField
                control={form.control}
                name="batchSize"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Batch Size</FormLabel>
                    <FormControl>
                      <Input type="number" min="1" {...field} value={typeof field.value === 'number' ? field.value : ""} />
                    </FormControl>
                    <FormDescription>Number of items per batch</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {mode === "splitByField" && (
              <FormField
                control={form.control}
                name="field"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Field</FormLabel>
                    <FormControl>
                      <Input placeholder="type" {...field} />
                    </FormControl>
                    <FormDescription>Group items by this field</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {mode === "splitByDelimiter" && (
              <FormField
                control={form.control}
                name="delimiter"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Delimiter</FormLabel>
                    <FormControl>
                      <Input placeholder="," {...field} />
                    </FormControl>
                    <FormDescription>Character to split on</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <FormField
              control={form.control}
              name="inputVariable"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Input Variable</FormLabel>
                  <FormControl>
                    <Input placeholder="data" {...field} />
                  </FormControl>
                  <FormDescription>Variable name containing data to split</FormDescription>
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

