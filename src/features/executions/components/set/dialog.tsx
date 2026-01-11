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
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Trash2 } from "lucide-react";

const fieldSchema = z.object({
  name: z.string().min(1, "Field name is required"),
  value: z.string(),
  type: z.enum(["string", "number", "boolean", "json", "expression"]),
});

const formSchema = z.object({
  fields: z.array(fieldSchema).min(1, "At least one field is required"),
  keepOnlySet: z.boolean().default(false),
});

type SetFormInput = z.input<typeof formSchema>;
export type SetFormValues = z.output<typeof formSchema>;

const DEFAULT_VALUES: SetFormValues = {
  fields: [{ name: "newField", value: "", type: "string" }],
  keepOnlySet: false,
};

interface SetDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: SetFormValues) => void;
  defaultValues?: Partial<SetFormValues>;
}

export function SetDialog({
  open,
  onOpenChange,
  onSubmit,
  defaultValues,
}: SetDialogProps) {
  const formDefaults = useMemo<SetFormInput>(
    () => ({
      fields: defaultValues?.fields ?? DEFAULT_VALUES.fields,
      keepOnlySet: defaultValues?.keepOnlySet ?? DEFAULT_VALUES.keepOnlySet,
    }),
    [defaultValues],
  );

  const form = useForm<SetFormInput, unknown, SetFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: formDefaults,
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "fields",
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
          <DialogTitle>Set</DialogTitle>
          <DialogDescription>
            Set or modify variables in the workflow context.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form className="space-y-4" onSubmit={handleDialogSubmit}>
            <div className="space-y-3">
              <FormLabel>Fields</FormLabel>
              {fields.map((field, index) => (
                <div key={field.id} className="flex gap-2 items-start p-3 border rounded-md">
                  <div className="flex-1 space-y-2">
                    <FormField
                      control={form.control}
                      name={`fields.${index}.name`}
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <Input placeholder="Variable name" {...field} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <div className="flex gap-2">
                      <FormField
                        control={form.control}
                        name={`fields.${index}.value`}
                        render={({ field }) => (
                          <FormItem className="flex-1">
                            <FormControl>
                              <Input placeholder="Value" {...field} />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name={`fields.${index}.type`}
                        render={({ field }) => (
                          <FormItem className="w-28">
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="string">String</SelectItem>
                                <SelectItem value="number">Number</SelectItem>
                                <SelectItem value="boolean">Boolean</SelectItem>
                                <SelectItem value="json">JSON</SelectItem>
                                <SelectItem value="expression">Expression</SelectItem>
                              </SelectContent>
                            </Select>
                          </FormItem>
                        )}
                      />
                    </div>
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
                onClick={() => append({ name: "", value: "", type: "string" })}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Field
              </Button>
            </div>

            <FormField
              control={form.control}
              name="keepOnlySet"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                  <div className="space-y-0.5">
                    <FormLabel>Keep Only Set Fields</FormLabel>
                    <FormDescription>
                      Remove all other context variables
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

