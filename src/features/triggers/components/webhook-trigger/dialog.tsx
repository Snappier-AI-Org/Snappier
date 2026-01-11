"use client";

import { useMemo, useState, useCallback, useEffect, useRef } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import z from "zod";
import { CopyIcon, CheckIcon, ExternalLinkIcon, Radio, Loader2, CheckCircle2 } from "lucide-react";
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
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { VariableTokenList } from "@/features/editor/components/workflow-variables-panel";

const formSchema = z.object({
  httpMethod: z.enum(["GET", "POST", "PUT", "PATCH", "DELETE", "ALL"]),
  path: z.string().optional(),
  authentication: z.enum(["none", "header_secret"]),
  respondImmediately: z.boolean(),
  responseStatusCode: z.number(),
  responseContentType: z.string(),
});
export type WebhookTriggerFormValues = z.infer<typeof formSchema>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  nodeId: string;
  onSubmit?: (values: WebhookTriggerFormValues) => void;
  defaultValues?: Partial<WebhookTriggerFormValues>;
}

export const WebhookTriggerDialog = ({ 
  open, 
  onOpenChange, 
  nodeId,
  onSubmit,
  defaultValues = {},
}: Props) => {
  const params = useParams();
  const workflowId = params.workflowId as string;
  const [copied, setCopied] = useState<"test" | "production" | null>(null);
  const [activeUrlTab, setActiveUrlTab] = useState<"test" | "production">("test");
  const [isListening, setIsListening] = useState(false);
  const [lastReceivedEvent, setLastReceivedEvent] = useState<Record<string, unknown> | null>(null);
  const [listeningTimeout, setListeningTimeout] = useState<number>(120); // 2 minutes default
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number | null>(null);

  const form = useForm<WebhookTriggerFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      httpMethod: defaultValues.httpMethod || "ALL",
      path: defaultValues.path || nodeId,
      authentication: defaultValues.authentication || "none",
      respondImmediately: defaultValues.respondImmediately ?? true,
      responseStatusCode: defaultValues.responseStatusCode || 200,
      responseContentType: defaultValues.responseContentType || "application/json",
    },
  });

  const watchMethod = form.watch("httpMethod");
  const watchAuth = form.watch("authentication");

  const webhookUrl = useMemo(() => {
    const baseUrl = process.env.NEXT_PUBLIC_WEBHOOK_URL || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const url = new URL(`/api/webhooks/custom`, baseUrl);
    url.searchParams.set("workflowId", workflowId);
    if (nodeId) {
      url.searchParams.set("nodeId", nodeId);
    }
    return url.toString();
  }, [nodeId, workflowId]);

  // Cleanup polling on unmount or dialog close
  useEffect(() => {
    if (!open) {
      stopListening();
    }
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, [open]);

  const startListening = useCallback(() => {
    setIsListening(true);
    setLastReceivedEvent(null);
    startTimeRef.current = Date.now();
    
    toast.info("Listening for webhook events...", {
      description: `Send a request to the webhook URL within ${listeningTimeout} seconds.`,
    });

    // Poll for new executions (simplified - in production you'd use WebSockets or SSE)
    pollingIntervalRef.current = setInterval(async () => {
      try {
        // Check if timeout exceeded
        if (startTimeRef.current && Date.now() - startTimeRef.current > listeningTimeout * 1000) {
          stopListening();
          toast.error("Listening timed out", {
            description: "No webhook event received within the timeout period.",
          });
          return;
        }

        // Fetch latest execution for this workflow
        const response = await fetch(`/api/executions/latest?workflowId=${workflowId}`);
        if (response.ok) {
          const data = await response.json();
          // Check if this is a new execution started after we began listening
          if (data.execution && startTimeRef.current) {
            const executionTime = new Date(data.execution.startedAt).getTime();
            if (executionTime > startTimeRef.current) {
              // New execution detected!
              // Parse the output to get the complete webhook data structure
              let completePayload: any = {};
              
              try {
                const output = typeof data.execution.output === 'string' 
                  ? JSON.parse(data.execution.output) 
                  : data.execution.output;
                
                // Build complete structure similar to the example
                completePayload = {
                  webhook: output?.webhook || output || {},
                  executionData: {
                    executionId: data.execution.id,
                    status: data.execution.status,
                    startedAt: data.execution.startedAt,
                    completedAt: data.execution.completedAt,
                  }
                };
              } catch (e) {
                // If parsing fails, show the raw execution
                completePayload = {
                  webhook: {
                    _note: "Webhook triggered successfully!",
                    _tip: "Send data in the request body to see it here. Data will be available as {{webhook.payload}}, {{webhook.headers}}, {{webhook.query}}, etc."
                  },
                  executionData: {
                    executionId: data.execution.id,
                    status: data.execution.status,
                    startedAt: data.execution.startedAt,
                  }
                };
              }
              
              setLastReceivedEvent(completePayload);
              stopListening();
              toast.success("Webhook event received!", {
                description: "Check the complete payload below.",
              });
            }
          }
        }
      } catch (error) {
        console.error("Error polling for webhook events:", error);
      }
    }, 2000); // Poll every 2 seconds
  }, [workflowId, listeningTimeout]);

  const stopListening = useCallback(() => {
    setIsListening(false);
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
    startTimeRef.current = null;
  }, []);

  const handleCopy = useCallback(async (type: "test" | "production") => {
    try {
      await navigator.clipboard.writeText(webhookUrl);
      setCopied(type);
      toast.success("Webhook URL copied to clipboard");
      setTimeout(() => setCopied(null), 2000);
    } catch {
      toast.error("Failed to copy URL");
    }
  }, [webhookUrl]);

  const handleSubmit = (values: z.infer<typeof formSchema>) => {
    onSubmit?.(values);
    toast.success("Webhook configuration saved");
    onOpenChange(false);
  };

  // Webhook output variables
  const webhookVariables = [
    { token: "{{webhook.payload}}", label: "Payload", description: "The request body/payload" },
    { token: "{{webhook.query}}", label: "Query", description: "URL query parameters" },
    { token: "{{webhook.headers}}", label: "Headers", description: "Request headers" },
    { token: "{{webhook.method}}", label: "Method", description: "HTTP method used" },
    { token: "{{webhook.rawBody}}", label: "Raw Body", description: "Raw request body string" },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Webhook Trigger</DialogTitle>
          <DialogDescription>
            Configure how this workflow receives incoming webhook requests.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="parameters" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="parameters">Parameters</TabsTrigger>
            <TabsTrigger value="setup">Setup Guide</TabsTrigger>
            <TabsTrigger value="examples">Popular Services</TabsTrigger>
          </TabsList>

          <TabsContent value="parameters" className="space-y-6 mt-4">
            {/* Webhook URLs Section */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">Webhook URLs</Label>
              <Tabs value={activeUrlTab} onValueChange={(v) => setActiveUrlTab(v as "test" | "production")}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="test">Test URL</TabsTrigger>
                  <TabsTrigger value="production">Production URL</TabsTrigger>
                </TabsList>
                <TabsContent value="test" className="mt-3">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="shrink-0">
                      {watchMethod === "ALL" ? "ALL" : watchMethod}
                    </Badge>
                    <code className="flex-1 rounded bg-muted px-2 py-1.5 text-xs font-mono overflow-x-auto break-all">
                      {webhookUrl}
                    </code>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => handleCopy("test")}
                      className="shrink-0"
                    >
                      {copied === "test" ? (
                        <CheckIcon className="size-4" />
                      ) : (
                        <CopyIcon className="size-4" />
                      )}
                    </Button>
                  </div>
                </TabsContent>
                <TabsContent value="production" className="mt-3">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="shrink-0">
                      {watchMethod === "ALL" ? "ALL" : watchMethod}
                    </Badge>
                    <code className="flex-1 rounded bg-muted px-2 py-1.5 text-xs font-mono overflow-x-auto break-all">
                      {webhookUrl}
                    </code>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => handleCopy("production")}
                      className="shrink-0"
                    >
                      {copied === "production" ? (
                        <CheckIcon className="size-4" />
                      ) : (
                        <CopyIcon className="size-4" />
                      )}
                    </Button>
                  </div>
                </TabsContent>
              </Tabs>
              
              <p className="text-xs text-muted-foreground bg-amber-500/10 border border-amber-500/20 rounded-md p-3">
                If you are sending back a response, add a "Content-Type" response header with the appropriate value to avoid unexpected behavior.
              </p>
            </div>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="httpMethod"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>HTTP Method</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select method" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="ALL">All Methods</SelectItem>
                          <SelectItem value="GET">GET</SelectItem>
                          <SelectItem value="POST">POST</SelectItem>
                          <SelectItem value="PUT">PUT</SelectItem>
                          <SelectItem value="PATCH">PATCH</SelectItem>
                          <SelectItem value="DELETE">DELETE</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Which HTTP method(s) to accept for this webhook.
                      </FormDescription>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="path"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Path</FormLabel>
                      <FormControl>
                        <Input placeholder={nodeId} {...field} />
                      </FormControl>
                      <FormDescription>
                        Custom path identifier for this webhook (defaults to node ID).
                      </FormDescription>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="authentication"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Authentication</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select authentication" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="none">None</SelectItem>
                          <SelectItem value="header_secret">Header Secret</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        {watchAuth === "header_secret" 
                          ? "Set WEBHOOK_TRIGGER_SECRET env var. Include x-webhook-secret header in requests."
                          : "No authentication required for incoming webhooks."
                        }
                      </FormDescription>
                    </FormItem>
                  )}
                />

                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="respondImmediately">Respond Immediately</Label>
                    <p className="text-xs text-muted-foreground">
                      Return response before workflow completes
                    </p>
                  </div>
                  <Switch
                    id="respondImmediately"
                    checked={form.watch("respondImmediately")}
                    onCheckedChange={(checked) => form.setValue("respondImmediately", checked)}
                  />
                </div>

                {/* Output Variables */}
                <div className="space-y-3">
                  <Label className="text-sm font-medium">Output Variables</Label>
                  <div className="rounded-md border bg-muted/40 p-3">
                    <p className="text-xs font-medium text-muted-foreground mb-2">
                      Access webhook data in your workflow
                    </p>
                    <VariableTokenList
                      variables={webhookVariables}
                      emptyMessage=""
                    />
                  </div>
                </div>

                {/* Listen for Test Event */}
                <div className="space-y-3">
                  <Label className="text-sm font-medium">Test Webhook</Label>
                  <div className="rounded-md border p-4 space-y-4">
                    <p className="text-xs text-muted-foreground">
                      Start listening and send a request to your webhook URL to test it. The received event data will be shown below.
                    </p>
                    
                    <div className="flex items-center gap-3">
                      {!isListening ? (
                        <Button 
                          type="button" 
                          variant="outline" 
                          onClick={startListening}
                          className="gap-2"
                        >
                          <Radio className="size-4" />
                          Listen for Test Event
                        </Button>
                      ) : (
                        <Button 
                          type="button" 
                          variant="destructive" 
                          onClick={stopListening}
                          className="gap-2"
                        >
                          <Loader2 className="size-4 animate-spin" />
                          Stop Listening
                        </Button>
                      )}
                      
                      {isListening && (
                        <span className="text-sm text-muted-foreground animate-pulse">
                          Waiting for webhook event...
                        </span>
                      )}
                    </div>

                    {lastReceivedEvent && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 text-sm text-[#0021F3] dark:text-[#5C70EA]">
                            <CheckCircle2 className="size-4" />
                            Event Received!
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              navigator.clipboard.writeText(JSON.stringify(lastReceivedEvent, null, 2));
                              toast.success("Payload copied to clipboard");
                            }}
                            className="h-7 text-xs"
                          >
                            <CopyIcon className="size-3 mr-1" />
                            Copy
                          </Button>
                        </div>
                        <div className="rounded-md border bg-muted/50">
                          <div className="bg-muted px-3 py-2 border-b">
                            <span className="text-xs font-mono font-medium">Complete Webhook Payload</span>
                          </div>
                          <pre className="p-3 text-xs font-mono overflow-x-auto max-h-96 overflow-y-auto">
                            {JSON.stringify(lastReceivedEvent, null, 2)}
                          </pre>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Access data in your workflow using: <code className="bg-muted px-1 py-0.5 rounded">{"{{webhook.payload}}"}</code>, <code className="bg-muted px-1 py-0.5 rounded">{"{{webhook.headers}}"}</code>, <code className="bg-muted px-1 py-0.5 rounded">{"{{webhook.query}}"}</code>, etc.
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button type="submit">Save Configuration</Button>
                </div>
              </form>
            </Form>
          </TabsContent>

          <TabsContent value="setup" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="webhook-url">Your Webhook URL</Label>
              <div className="flex gap-2">
                <Input
                  id="webhook-url"
                  value={webhookUrl}
                  readOnly
                  className="font-mono text-xs"
                />
                <Button type="button" size="icon" variant="outline" onClick={() => handleCopy("test")}>
                  {copied ? <CheckIcon className="size-4" /> : <CopyIcon className="size-4" />}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Copy this URL and paste it into the webhook settings of the service you want to connect.
              </p>
            </div>

            <Alert>
              <AlertDescription className="text-sm">
                💡 <strong>What are webhooks?</strong> Webhooks let other services send data to your workflow automatically when something happens (like a new order, form submission, or payment).
              </AlertDescription>
            </Alert>

            <div className="rounded-lg border bg-muted/50 p-4 space-y-2">
              <h4 className="font-medium text-sm">Available Data</h4>
              <p className="text-xs text-muted-foreground">
                Data sent to this webhook will be available in your workflow:
              </p>
              <ul className="text-xs text-muted-foreground space-y-1 mt-2">
                <li><code className="bg-background px-1 rounded">webhook.payload</code> - Request body</li>
                <li><code className="bg-background px-1 rounded">webhook.query</code> - Query parameters</li>
                <li><code className="bg-background px-1 rounded">webhook.headers</code> - Request headers</li>
                <li><code className="bg-background px-1 rounded">webhook.method</code> - HTTP method</li>
              </ul>
            </div>
          </TabsContent>

          <TabsContent value="examples" className="space-y-4">
            <div className="space-y-3">
              <ServiceGuide
                name="Zalo Bot"
                description="Receive Zalo Bot messages and events"
                steps={[
                  "Go to developers.zalo.me → Your Bot → Webhook Settings",
                  "Paste your webhook URL",
                  "Configure which events to subscribe to",
                  "Save and verify webhook"
                ]}
                docsUrl="https://developers.zalo.me/docs/api/zalo-chatbot-api/webhook"
              />

              <ServiceGuide
                name="Stripe"
                description="Receive payment notifications"
                steps={[
                  "Go to Stripe Dashboard → Developers → Webhooks",
                  "Click 'Add endpoint'",
                  "Paste your webhook URL",
                  "Select events (e.g., payment_intent.succeeded)",
                  "Click 'Add endpoint'"
                ]}
                docsUrl="https://stripe.com/docs/webhooks"
              />

              <ServiceGuide
                name="Shopify"
                description="Get notified about new orders"
                steps={[
                  "Go to Shopify Admin → Settings → Notifications",
                  "Scroll to 'Webhooks'",
                  "Click 'Create webhook'",
                  "Select 'Order creation' as the event",
                  "Paste your webhook URL",
                  "Click 'Save'"
                ]}
                docsUrl="https://shopify.dev/docs/apps/webhooks"
              />

              <ServiceGuide
                name="GitHub"
                description="Trigger on repository events"
                steps={[
                  "Go to your repository → Settings → Webhooks",
                  "Click 'Add webhook'",
                  "Paste your webhook URL in 'Payload URL'",
                  "Select which events you want (push, pull request, etc.)",
                  "Click 'Add webhook'"
                ]}
                docsUrl="https://docs.github.com/webhooks"
              />

              <ServiceGuide
                name="Typeform"
                description="Receive form submissions"
                steps={[
                  "Open your form → Connect → Webhooks",
                  "Click 'Add a webhook'",
                  "Paste your webhook URL",
                  "Click 'Save webhook'"
                ]}
                docsUrl="https://www.typeform.com/help/webhooks/"
              />

              <ServiceGuide
                name="Cal.com"
                description="Get booking notifications"
                steps={[
                  "Go to Settings → Developer → Webhooks",
                  "Click 'New webhook'",
                  "Paste your webhook URL",
                  "Select trigger events",
                  "Save"
                ]}
                docsUrl="https://cal.com/docs/integrations/webhooks"
              />
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

// Helper component for service guides
const ServiceGuide = ({ 
  name, 
  description, 
  steps, 
  docsUrl 
}: { 
  name: string; 
  description: string; 
  steps: string[]; 
  docsUrl: string;
}) => (
  <div className="rounded-lg border p-4 space-y-3">
    <div className="flex items-start justify-between">
      <div>
        <h4 className="font-medium text-sm">{name}</h4>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <Button variant="ghost" size="sm" asChild>
        <a href={docsUrl} target="_blank" rel="noopener noreferrer">
          <ExternalLinkIcon className="size-3 mr-1" />
          Docs
        </a>
      </Button>
    </div>
    <ol className="text-xs space-y-1.5 list-decimal list-inside text-muted-foreground">
      {steps.map((step, i) => (
        <li key={i}>{step}</li>
      ))}
    </ol>
  </div>
);
