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
import { Textarea } from "@/components/ui/textarea";

const formSchema = z.object({
  variableName: z.string().min(1, "Variable name is required"),
  code: z.string().min(1, "Code is required"),
});

type CodeFormInput = z.input<typeof formSchema>;
export type CodeFormValues = z.output<typeof formSchema>;

const DEFAULT_VALUES: CodeFormValues = {
  variableName: "result",
  code: `// Access input data with $input or $json('variableName')
// Return the result
return {
  message: "Hello from Code node!",
  timestamp: $now().toISOString(),
  uuid: $uuid()
};`,
};

interface CodeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: CodeFormValues) => void;
  defaultValues?: Partial<CodeFormValues>;
}

export function CodeDialog({
  open,
  onOpenChange,
  onSubmit,
  defaultValues,
}: CodeDialogProps) {
  const formDefaults = useMemo<CodeFormInput>(
    () => ({
      variableName: defaultValues?.variableName ?? DEFAULT_VALUES.variableName,
      code: defaultValues?.code ?? DEFAULT_VALUES.code,
    }),
    [defaultValues],
  );

  const form = useForm<CodeFormInput, unknown, CodeFormValues>({
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
      <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Code</DialogTitle>
          <DialogDescription>
            Execute custom JavaScript code. Use $input for context data.
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
                    <Input placeholder="result" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="code"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>JavaScript Code</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="// Your code here"
                      className="font-mono text-sm min-h-[200px]"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Available: $input (context), $json(key), $now(), $uuid(), console, JSON, Math, Date
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

