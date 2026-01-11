"use client";

import { CopyIcon } from "lucide-react";
import { useParams } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { VariableTokenList } from "@/features/editor/components/workflow-variables-panel";
import { getStripeVariables } from "@/features/editor/lib/workflow-variables";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const StripeTriggerDialog = ({
  open,
  onOpenChange,
}: Props) => {
  const params = useParams();
  const workflowId = params.workflowId as string;

  // Construct the webhook URL
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const webhookUrl = `${baseUrl}/api/webhooks/stripe?workflowId=${workflowId}`;

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(webhookUrl);
      toast.success("Webhook URL copied to clipboard");
    } catch {
      toast.error("Failed to copy URL");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Stripe Trigger Configuration</DialogTitle>
          <DialogDescription>
            Use this webhook URL in Stripe's dashboard to trigger the workflow
            when an event fires.
          </DialogDescription>
        </DialogHeader>
        <div className="mt-4 flex flex-col gap-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="webhook-url">Webhook URL</Label>
              <div className="flex gap-2">
                <Input
                  id="webhook-url"
                  value={webhookUrl}
                  readOnly
                  className="font-mono text-sm"
                />
                <Button
                  type="button"
                  size="icon"
                  variant="outline"
                  onClick={copyToClipboard}
                >
                  <CopyIcon className="size-4" />
                </Button>
              </div>
            </div>

            <div className="rounded-lg bg-muted p-4 space-y-2">
              <h4 className="font-medium text-sm">Setup instructions:</h4>
              <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
                <li>Open your Stripe Dashboard</li>
                <li>Go to Developers → Webhooks</li>
                <li>Click "Add endpoint" and paste the URL above</li>
                <li>Choose the events to listen for</li>
                <li>Save and copy the signing secret</li>
                <li>Store the secret in your environment variables</li>
              </ol>
            </div>

            <div className="rounded-lg bg-muted p-4 space-y-3">
              <h4 className="font-medium text-sm">Available Variables</h4>
              <VariableTokenList variables={getStripeVariables()} />
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
