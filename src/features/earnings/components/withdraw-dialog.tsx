"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, Wallet, AlertCircle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useRequestPayout } from "../hooks/use-earnings";
import { toast } from "sonner";

const withdrawFormSchema = z.object({
  amount: z.number().min(1000, "Minimum withdrawal is $10"),
  method: z.enum(["PAYPAL", "BANK_TRANSFER", "WISE", "CRYPTO", "OTHER"]),
  email: z.string().email().optional().or(z.literal("")),
  accountNumber: z.string().optional(),
  bankName: z.string().optional(),
  routingNumber: z.string().optional(),
  walletAddress: z.string().optional(),
  notes: z.string().optional(),
});

type WithdrawFormValues = z.infer<typeof withdrawFormSchema>;

interface WithdrawDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  availableBalance: number;
  minimumWithdrawal: number;
}

function formatCurrency(cents: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);
}

export function WithdrawDialog({
  open,
  onOpenChange,
  availableBalance,
  minimumWithdrawal,
}: WithdrawDialogProps) {
  const [amountInput, setAmountInput] = useState("");
  const requestPayout = useRequestPayout();

  const form = useForm<WithdrawFormValues>({
    resolver: zodResolver(withdrawFormSchema),
    defaultValues: {
      amount: availableBalance,
      method: "PAYPAL",
      email: "",
      accountNumber: "",
      bankName: "",
      routingNumber: "",
      walletAddress: "",
      notes: "",
    },
  });

  const selectedMethod = form.watch("method");

  async function onSubmit(values: WithdrawFormValues) {
    try {
      const result = await requestPayout.mutateAsync({
        amount: values.amount,
        method: values.method,
        payoutDetails: {
          email: values.email || undefined,
          accountNumber: values.accountNumber || undefined,
          bankName: values.bankName || undefined,
          routingNumber: values.routingNumber || undefined,
          walletAddress: values.walletAddress || undefined,
          notes: values.notes || undefined,
        },
      });

      toast.success(result.message);
      onOpenChange(false);
      form.reset();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to submit withdrawal request");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wallet className="size-5" />
            Request Withdrawal
          </DialogTitle>
          <DialogDescription>
            Withdraw your earnings to your preferred payment method
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Amount */}
            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Amount</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                        $
                      </span>
                      <Input
                        type="number"
                        step="0.01"
                        min={minimumWithdrawal / 100}
                        max={availableBalance / 100}
                        placeholder="0.00"
                        className="pl-7"
                        value={amountInput}
                        onChange={(e) => {
                          setAmountInput(e.target.value);
                          const cents = Math.round(parseFloat(e.target.value || "0") * 100);
                          field.onChange(cents);
                        }}
                      />
                    </div>
                  </FormControl>
                  <FormDescription>
                    Available: {formatCurrency(availableBalance)} • Min: {formatCurrency(minimumWithdrawal)}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Quick amount buttons */}
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setAmountInput((availableBalance / 100).toFixed(2));
                  form.setValue("amount", availableBalance);
                }}
              >
                Max
              </Button>
              {availableBalance >= 5000 && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setAmountInput("50.00");
                    form.setValue("amount", 5000);
                  }}
                >
                  $50
                </Button>
              )}
              {availableBalance >= 10000 && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setAmountInput("100.00");
                    form.setValue("amount", 10000);
                  }}
                >
                  $100
                </Button>
              )}
            </div>

            {/* Payment Method */}
            <FormField
              control={form.control}
              name="method"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Payment Method</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select payment method" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="PAYPAL">PayPal</SelectItem>
                      <SelectItem value="BANK_TRANSFER">Bank Transfer</SelectItem>
                      <SelectItem value="WISE">Wise (TransferWise)</SelectItem>
                      <SelectItem value="CRYPTO">Cryptocurrency</SelectItem>
                      <SelectItem value="OTHER">Other</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* PayPal fields */}
            {selectedMethod === "PAYPAL" && (
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>PayPal Email</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="your@email.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Bank Transfer fields */}
            {selectedMethod === "BANK_TRANSFER" && (
              <>
                <FormField
                  control={form.control}
                  name="bankName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Bank Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Bank of America" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="accountNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Account Number</FormLabel>
                      <FormControl>
                        <Input placeholder="Account number" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="routingNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Routing Number</FormLabel>
                      <FormControl>
                        <Input placeholder="Routing number" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </>
            )}

            {/* Wise fields */}
            {selectedMethod === "WISE" && (
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Wise Email</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="your@email.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Crypto fields */}
            {selectedMethod === "CRYPTO" && (
              <FormField
                control={form.control}
                name="walletAddress"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Wallet Address</FormLabel>
                    <FormControl>
                      <Input placeholder="0x... or bc1..." {...field} />
                    </FormControl>
                    <FormDescription>
                      USDT (TRC20), USDC (ERC20), or BTC
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Notes */}
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Additional Notes (Optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Any additional information..."
                      className="resize-none"
                      rows={2}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Alert>
              <AlertCircle className="size-4" />
              <AlertDescription>
                Withdrawal requests are processed manually within 3-5 business days.
              </AlertDescription>
            </Alert>

            <div className="flex gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="flex-1"
                disabled={requestPayout.isPending}
              >
                {requestPayout.isPending ? (
                  <>
                    <Loader2 className="size-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  "Submit Request"
                )}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

