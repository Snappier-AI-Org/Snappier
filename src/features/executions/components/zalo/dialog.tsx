"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import z from "zod";
import { InfoIcon, ExternalLinkIcon, CopyIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
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
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  ConfigDialogDescription,
  ConfigDialogFooter,
  ConfigDialogHeader,
  ConfigDialogTitle,
  ConfigurationPanelLayout,
} from "@/features/editor/components/configuration-panel-layout";
import { VariableTokenList } from "@/features/editor/components/workflow-variables-panel";
import type { WorkflowVariableGroup } from "@/features/editor/lib/workflow-variables";
import { getZaloVariables } from "@/features/editor/lib/workflow-variables";
import { toast } from "sonner";

const formSchema = z.object({
  variableName: z
    .string()
    .min(1, { message: "Variable name is required" })
    .regex(/^[A-Za-z_$][A-Za-z0-9_$]*$/, {
      message:
        "Variable name must start with a letter or underscore and contain only letters, numbers, and underscores",
    }),
  accessToken: z.string().min(1, "Access token is required"),
  recipientId: z.string().min(1, "Recipient ID is required"),
  content: z
    .string()
    .min(1, "Message content is required")
    .max(2000, "Zalo Bot messages cannot exceed 2000 characters"),
});

export type ZaloFormValues = z.infer<typeof formSchema>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: ZaloFormValues) => void;
  defaultValues?: Partial<ZaloFormValues>;
  workflowVariables?: WorkflowVariableGroup[];
  currentNodeId?: string;
}

export const ZaloDialog = ({
  open,
  onOpenChange,
  onSubmit,
  defaultValues = {},
  workflowVariables = [],
  currentNodeId,
}: Props) => {
  const dialogContentRef = useRef<HTMLDivElement>(null);
  const [activeTab, setActiveTab] = useState<"config" | "api-docs">("config");
  
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      variableName: defaultValues.variableName || "",
      accessToken: defaultValues.accessToken || "",
      recipientId: defaultValues.recipientId || "",
      content: defaultValues.content || "",
    },
  });

  // Reset form values when dialog opens with new defaults
  useEffect(() => {
    if (open) {
      form.reset({
        variableName: defaultValues.variableName || "",
        accessToken: defaultValues.accessToken || "",
        recipientId: defaultValues.recipientId || "",
        content: defaultValues.content || "",
      });
    }
  }, [open, defaultValues, form]);

  const watchVariableName = form.watch("variableName") || "myZaloBot";

  const handleSubmit = (values: z.infer<typeof formSchema>) => {
    onSubmit(values);
    onOpenChange(false);
  };

  // cURL example for Zalo Bot API
  const curlExample = `curl -X POST 'https://openapi.zalo.me/v2.0/oa/message' \\
  -H 'Content-Type: application/json' \\
  -H 'access_token: YOUR_ACCESS_TOKEN' \\
  -d '{
    "recipient": {
      "user_id": "RECIPIENT_ID"
    },
    "message": {
      "text": "Hello from ChatToFlow!"
    }
  }'`;

  const handleCopyCurl = () => {
    navigator.clipboard.writeText(curlExample);
    toast.success("cURL command copied to clipboard");
  };

  return (
    <ConfigurationPanelLayout
      open={open}
      onOpenChange={onOpenChange}
      workflowVariables={workflowVariables}
      currentNodeId={currentNodeId}
      dialogContentRef={dialogContentRef}
    >
      <ConfigDialogHeader>
        <ConfigDialogTitle>Zalo Bot Configuration</ConfigDialogTitle>
        <ConfigDialogDescription>
          Send messages via your Zalo Bot. Connect with users through Zalo's chatbot platform.
        </ConfigDialogDescription>
      </ConfigDialogHeader>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "config" | "api-docs")} className="mt-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="config">Configuration</TabsTrigger>
          <TabsTrigger value="api-docs">API Reference</TabsTrigger>
        </TabsList>

        <TabsContent value="config" className="mt-4">
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(handleSubmit)}
              className="space-y-6"
            >
              <FormField
                control={form.control}
                name="variableName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Variable Name</FormLabel>
                    <FormControl>
                      <Input placeholder="myZaloBot" {...field} />
                    </FormControl>
                    <FormDescription>
                      Use this name to reference the result: {`{{${watchVariableName}.messageId}}`}
                    </FormDescription>
                    {watchVariableName ? (
                      <div className="rounded-md border bg-muted/40 p-3">
                        <p className="text-xs font-medium text-muted-foreground mb-2">
                          Outputs from this node
                        </p>
                        <VariableTokenList
                          variables={getZaloVariables(watchVariableName)}
                          emptyMessage=""
                        />
                      </div>
                    ) : null}
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="accessToken"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Bot Token (Access Token)</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder="1234567890:abcdefghijklmnopqrstuvwxyz..."
                        {...field}
                      />
                    </FormControl>
                    <FormDescription className="space-y-1">
                      <span className="block">
                        Get your <strong>Bot Token</strong> from{" "}
                        <a 
                          href="https://developers.zalo.me" 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-primary hover:underline"
                        >
                          developers.zalo.me
                        </a>
                        {" "}→ Your Bot → Settings → Bot Token
                      </span>
                      <span className="block text-amber-600 dark:text-amber-400">
                        ⚠️ Use the long Bot Token (e.g., 1234567890:abc...), NOT the webhook Secret Token
                      </span>
                      <span className="block text-muted-foreground text-xs">
                        Tokens expire - click Reset in Zalo settings to get a new one via Zalo message
                      </span>
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="recipientId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Chat ID</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., abc.xyz or {{webhook.payload.message.chat.id}}" {...field} />
                    </FormControl>
                    <FormDescription className="space-y-1">
                      <span className="block">• Get this from webhook payload: <code className="bg-muted px-1 rounded">{"{{webhook.payload.message.chat.id}}"}</code></span>
                      <span className="block">• User must have started a conversation with your bot first</span>
                      <span className="block text-muted-foreground text-xs">• For Zalo Bot API, use the chat_id from the webhook event</span>
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="content"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Message Content</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Hello {{webhook.payload.message.from.display_name}}! You said: {{webhook.payload.message.text}}"
                        className="min-h-[100px]"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Max 2000 characters. Use {"{{variables}}"} for dynamic content.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Zalo Webhook Variables Reference */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <FormLabel className="text-sm font-medium">Zalo Webhook Variables</FormLabel>
                </div>
                <div className="rounded-md border bg-muted/40 p-3">
                  <p className="text-xs font-medium text-muted-foreground mb-2">
                    Use these variables when triggered by a Zalo webhook
                  </p>
                  <VariableTokenList
                    variables={[
                      { token: "{{webhook.payload.message.text}}", label: "Message Text", description: "The text sent by the user" },
                      { token: "{{webhook.payload.message.chat.id}}", label: "Chat ID", description: "Use this for replies" },
                      { token: "{{webhook.payload.message.from.id}}", label: "Sender ID", description: "User's Zalo ID" },
                      { token: "{{webhook.payload.message.from.display_name}}", label: "Sender Name", description: "User's display name" },
                      { token: "{{webhook.payload.message.message_id}}", label: "Message ID", description: "Unique message identifier" },
                      { token: "{{webhook.payload.message.date}}", label: "Timestamp", description: "Message timestamp" },
                      { token: "{{webhook.payload.event_name}}", label: "Event Name", description: "e.g., message.text.received" },
                    ]}
                    emptyMessage=""
                  />
                </div>
              </div>

              <ConfigDialogFooter>
                <Button type="submit">Save Configuration</Button>
              </ConfigDialogFooter>
            </form>
          </Form>
        </TabsContent>

        <TabsContent value="api-docs" className="mt-4 space-y-4">
          <Alert>
            <InfoIcon className="size-4" />
            <AlertDescription>
              This node uses the Zalo Bot API v2.0. You can also use the HTTP Request node with the cURL below.
            </AlertDescription>
          </Alert>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-medium">cURL Example</h4>
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopyCurl}
                className="gap-2"
              >
                <CopyIcon className="size-3" />
                Copy
              </Button>
            </div>
            <pre className="rounded-md border bg-muted p-4 text-xs font-mono overflow-x-auto whitespace-pre-wrap">
              {curlExample}
            </pre>
          </div>

          <div className="space-y-2">
            <h4 className="font-medium">API Endpoint</h4>
            <code className="block rounded bg-muted px-3 py-2 text-sm font-mono">
              POST https://openapi.zalo.me/v2.0/oa/message
            </code>
          </div>

          <div className="space-y-2">
            <h4 className="font-medium">Required Headers</h4>
            <ul className="space-y-1 text-sm">
              <li><code className="bg-muted px-1 rounded">access_token</code>: Your Bot access token</li>
              <li><code className="bg-muted px-1 rounded">Content-Type</code>: application/json</li>
            </ul>
          </div>

          <div className="space-y-2">
            <h4 className="font-medium">Response Codes</h4>
            <ul className="space-y-1 text-sm">
              <li><code className="bg-muted px-1 rounded">0</code>: Success</li>
              <li><code className="bg-muted px-1 rounded">-201</code>: Invalid recipient_id or access_token</li>
              <li><code className="bg-muted px-1 rounded">-213</code>: User has not interacted with bot</li>
              <li><code className="bg-muted px-1 rounded">-216</code>: Bot not found</li>
            </ul>
          </div>

          <Button
            variant="outline"
            className="w-full gap-2"
            onClick={() => window.open("https://developers.zalo.me/docs/api/zalo-chatbot-api", "_blank")}
          >
            <ExternalLinkIcon className="size-4" />
            View Full API Documentation
          </Button>
        </TabsContent>
      </Tabs>
    </ConfigurationPanelLayout>
  );
};


