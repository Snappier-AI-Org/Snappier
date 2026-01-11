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
import { VariableTokenList } from "@/features/editor/components/workflow-variables-panel";
import { getDelayWaitVariables } from "@/features/editor/lib/workflow-variables";

const DEFAULT_VARIABLE_NAME = "delay";
const VARIABLE_NAME_PATTERN = /^[A-Za-z_$][A-Za-z0-9_$]*$/;

const formSchema = z.object({
  amount: z.coerce
    .number()
    .min(0.1, { message: "Duration must be greater than 0" })
    .max(604800, { message: "Duration too long (max 7 days)" }),
  unit: z.enum(["seconds", "minutes", "hours", "days"]),
  variableName: z
    .string()
    .default("")
    .transform((value) => value.trim())
    .superRefine((value, ctx) => {
      if (!value) return;
      if (!VARIABLE_NAME_PATTERN.test(value)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message:
            "Must start with a letter and contain only letters, numbers, and underscores",
        });
        return;
      }
      if (value.length > 50) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Keep the variable name short",
        });
      }
    }),
});

type DelayWaitFormInput = z.input<typeof formSchema>;
export type DelayWaitFormValues = z.output<typeof formSchema>;

const DEFAULT_VALUES: DelayWaitFormValues = {
  amount: 5,
  unit: "seconds",
  variableName: "delay",
};

const UNIT_TO_MS: Record<DelayWaitFormValues["unit"], number> = {
  seconds: 1000,
  minutes: 1000 * 60,
  hours: 1000 * 60 * 60,
  days: 1000 * 60 * 60 * 24,
};

function formatDuration(amount: number, unit: DelayWaitFormValues["unit"]) {
  if (!Number.isFinite(amount)) return "";
  const minutes = (amount * UNIT_TO_MS[unit]) / 1000 / 60;
  if (minutes < 1) return "Less than a minute";
  if (minutes < 60) return `${minutes.toFixed(1)} min`;
  const hours = minutes / 60;
  if (hours < 24) return `${hours.toFixed(1)} hr`;
  const days = hours / 24;
  return `${days.toFixed(1)} days`;
}

interface DelayWaitDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: DelayWaitFormValues) => void;
  defaultValues?: Partial<DelayWaitFormValues>;
}

export function DelayWaitDialog({
  open,
  onOpenChange,
  onSubmit,
  defaultValues,
}: DelayWaitDialogProps) {
  const formDefaults = useMemo<DelayWaitFormInput>(
    () => ({
      amount: defaultValues?.amount ?? DEFAULT_VALUES.amount,
      unit: defaultValues?.unit ?? DEFAULT_VALUES.unit,
      variableName: defaultValues?.variableName ?? "",
    }),
    [defaultValues],
  );

  const form = useForm<DelayWaitFormInput, unknown, DelayWaitFormValues>({
    resolver: zodResolver<DelayWaitFormInput, unknown, DelayWaitFormValues>(
      formSchema,
    ),
    defaultValues: formDefaults,
  });

  useEffect(() => {
    if (open) {
      form.reset(formDefaults);
    }
  }, [open, form, formDefaults]);

  const rawAmount = form.watch("amount");
  const amount =
    typeof rawAmount === "number" ? rawAmount : Number(rawAmount ?? 0);
  const unit = form.watch("unit");
  const friendlyDuration = useMemo(
    () => formatDuration(amount, unit),
    [amount, unit],
  );

  const rawVariableName = form.watch("variableName");
  const trimmedVariableName = (rawVariableName ?? "").trim();
  const displayVariableName = trimmedVariableName || DEFAULT_VARIABLE_NAME;
  const delayVariables = useMemo(
    () => getDelayWaitVariables(displayVariableName),
    [displayVariableName],
  );
  const handleDialogSubmit = form.handleSubmit((values) => {
    const normalizedVariableName = values.variableName || DEFAULT_VARIABLE_NAME;
    onSubmit({ ...values, variableName: normalizedVariableName });
    onOpenChange(false);
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Delay / Wait</DialogTitle>
          <DialogDescription>
            Pause the workflow to respect rate limits or schedule a follow-up
            step.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form className="space-y-4" onSubmit={handleDialogSubmit}>
            {/* Variable Name - First field for consistency */}
            <FormField
              control={form.control}
              name="variableName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Output Variable Name</FormLabel>
                  <FormControl>
                    <Input placeholder={DEFAULT_VARIABLE_NAME} {...field} />
                  </FormControl>
                  <FormDescription>
                    Stores wait metadata in the workflow context (e.g.,{" "}
                    {`{{${displayVariableName}.completedAt}}`} ).
                  </FormDescription>
                  <div className="rounded-md border bg-muted/40 p-3">
                    <p className="text-xs font-medium text-muted-foreground mb-2">
                      Delay outputs
                    </p>
                    <VariableTokenList
                      variables={delayVariables}
                      emptyMessage=""
                    />
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Duration</FormLabel>
                  <div className="flex items-center gap-2">
                    <FormControl>
                      <Input
                        type="number"
                        step="0.1"
                        min="0.1"
                        value={
                          typeof field.value === "number" || typeof field.value === "string"
                            ? field.value
                            : ""
                        }
                        onChange={field.onChange}
                        onBlur={field.onBlur}
                        name={field.name}
                        ref={field.ref}
                      />
                    </FormControl>
                    <FormField
                      control={form.control}
                      name="unit"
                      render={({ field: unitField }) => (
                        <FormItem className="w-36">
                          <Select
                            onValueChange={unitField.onChange}
                            defaultValue={unitField.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="seconds">Seconds</SelectItem>
                              <SelectItem value="minutes">Minutes</SelectItem>
                              <SelectItem value="hours">Hours</SelectItem>
                              <SelectItem value="days">Days</SelectItem>
                            </SelectContent>
                          </Select>
                        </FormItem>
                      )}
                    />
                  </div>
                  <FormDescription>
                    Approx. total wait: {friendlyDuration || "-"}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter className="gap-2">
              <Button
                variant="outline"
                type="button"
                onClick={() => onOpenChange(false)}
              >
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
