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
import { Switch } from "@/components/ui/switch";

const formSchema = z.object({
  variableName: z.string().min(1, "Variable name is required"),
  continueOnError: z.boolean().default(true),
});

type ErrorTriggerFormInput = z.input<typeof formSchema>;
export type ErrorTriggerFormValues = z.output<typeof formSchema>;

const DEFAULT_VALUES: ErrorTriggerFormValues = {
  variableName: "error",
  continueOnError: true,
};

interface ErrorTriggerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: ErrorTriggerFormValues) => void;
  defaultValues?: Partial<ErrorTriggerFormValues>;
}

export function ErrorTriggerDialog({
  open,
  onOpenChange,
  onSubmit,
  defaultValues,
}: ErrorTriggerDialogProps) {
  const formDefaults = useMemo<ErrorTriggerFormInput>(
    () => ({
      variableName: defaultValues?.variableName ?? DEFAULT_VALUES.variableName,
      continueOnError: defaultValues?.continueOnError ?? DEFAULT_VALUES.continueOnError,
    }),
    [defaultValues],
  );

  const form = useForm<ErrorTriggerFormInput, unknown, ErrorTriggerFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: formDefaults,
  });

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
          <DialogTitle>Error Trigger</DialogTitle>
          <DialogDescription>
            Handle errors from previous workflow steps.
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
                    <Input placeholder="error" {...field} />
                  </FormControl>
                  <FormDescription>
                    Stores error details in {`{{${field.value || "error"}.message}}`}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="continueOnError"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                  <div className="space-y-0.5">
                    <FormLabel>Continue on Error</FormLabel>
                    <FormDescription>
                      Capture errors instead of stopping the workflow
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

