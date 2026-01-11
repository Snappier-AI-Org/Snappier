"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useMemo } from "react";
import { useForm, useFieldArray } from "react-hook-form";
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
import { Plus, Trash2 } from "lucide-react";

const ruleSchema = z.object({
  name: z.string().min(1, "Rule name is required"),
  condition: z.string().min(1, "Condition is required"),
  output: z.coerce.number().min(0),
});

const formSchema = z.object({
  variableName: z.string().min(1, "Variable name is required"),
  rules: z.array(ruleSchema).min(1, "At least one rule is required"),
  fallbackOutput: z.coerce.number().default(0),
});

type SwitchFormInput = z.input<typeof formSchema>;
export type SwitchFormValues = z.output<typeof formSchema>;

const DEFAULT_VALUES: SwitchFormValues = {
  variableName: "switchResult",
  rules: [{ name: "Rule 1", condition: "true", output: 0 }],
  fallbackOutput: 0,
};

interface SwitchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: SwitchFormValues) => void;
  defaultValues?: Partial<SwitchFormValues>;
}

export function SwitchDialog({
  open,
  onOpenChange,
  onSubmit,
  defaultValues,
}: SwitchDialogProps) {
  const formDefaults = useMemo<SwitchFormInput>(
    () => ({
      variableName: defaultValues?.variableName ?? DEFAULT_VALUES.variableName,
      rules: defaultValues?.rules ?? DEFAULT_VALUES.rules,
      fallbackOutput: defaultValues?.fallbackOutput ?? DEFAULT_VALUES.fallbackOutput,
    }),
    [defaultValues],
  );

  const form = useForm<SwitchFormInput, unknown, SwitchFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: formDefaults,
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "rules",
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
      <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Switch</DialogTitle>
          <DialogDescription>
            Route data to different outputs based on conditions.
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
                    <Input placeholder="switchResult" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-3">
              <FormLabel>Rules</FormLabel>
              {fields.map((field, index) => (
                <div key={field.id} className="flex gap-2 items-start p-3 border rounded-md">
                  <div className="flex-1 space-y-2">
                    <FormField
                      control={form.control}
                      name={`rules.${index}.name`}
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <Input placeholder="Rule name" {...field} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name={`rules.${index}.condition`}
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <Input placeholder="{{value}} === 'test'" {...field} />
                          </FormControl>
                          <FormDescription className="text-xs">
                            JavaScript expression (use {"{{variable}}"} for context)
                          </FormDescription>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name={`rules.${index}.output`}
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <Input type="number" placeholder="Output index" {...field} value={typeof field.value === 'number' ? field.value : ""} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => remove(index)}
                    disabled={fields.length === 1}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => append({ name: `Rule ${fields.length + 1}`, condition: "", output: fields.length })}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Rule
              </Button>
            </div>

            <FormField
              control={form.control}
              name="fallbackOutput"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Fallback Output</FormLabel>
                  <FormControl>
                    <Input type="number" {...field} value={typeof field.value === 'number' ? field.value : ""} />
                  </FormControl>
                  <FormDescription>
                    Output index when no rules match
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

