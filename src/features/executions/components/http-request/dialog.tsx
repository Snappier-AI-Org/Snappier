"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import z from "zod";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  ConfigDialogDescription,
  ConfigDialogFooter,
  ConfigDialogHeader,
  ConfigDialogTitle,
  ConfigurationPanelLayout,
} from "@/features/editor/components/configuration-panel-layout";
import { VariableTokenList } from "@/features/editor/components/workflow-variables-panel";
import type { WorkflowVariableGroup } from "@/features/editor/lib/workflow-variables";
import { getHttpRequestVariables } from "@/features/editor/lib/workflow-variables";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Import, Plus, Trash2, Play, Loader2, CheckCircle2, XCircle } from "lucide-react";
import { toast } from "sonner";
import { testHttpRequest } from "./actions";

const formSchema = z.object({
  variableName: z
    .string()
    .min(1, { message: "Variable name is required" })
    .regex(/^[A-Za-z_$][A-Za-z0-9_$]*$/, {
      message:
        "Variable name must start with a letter or underscore and contain only letters, numbers, and underscores",
    }),
  endpoint: z.string().min(1, { message: "Please enter a valid URL" }),
  method: z.enum(["GET", "POST", "PUT", "PATCH", "DELETE"]),
  body: z.string().optional(),
  bodyContentType: z.enum(["json", "form-urlencoded", "form-data", "raw"]).optional(),
  specifyBody: z.enum(["raw", "fields"]).optional(),
  bodyParameters: z.array(z.object({
    key: z.string(),
    value: z.string(),
  })).optional(),
  headers: z.array(z.object({
    key: z.string(),
    value: z.string(),
  })).optional(),
  queryParams: z.array(z.object({
    key: z.string(),
    value: z.string(),
  })).optional(),
  sendQueryParams: z.boolean().optional(),
  sendHeaders: z.boolean().optional(),
  sendBody: z.boolean().optional(),
  authentication: z.enum(["none", "basic", "bearer", "api_key"]).optional(),
  authCredentials: z.object({
    username: z.string().optional(),
    password: z.string().optional(),
    token: z.string().optional(),
    apiKey: z.string().optional(),
    apiKeyHeader: z.string().optional(),
  }).optional(),
});

export type HttpRequestFormValues = z.infer<typeof formSchema>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: z.infer<typeof formSchema>) => void;
  defaultValues?: Partial<HttpRequestFormValues>;
  workflowVariables?: WorkflowVariableGroup[];
  currentNodeId?: string;
}

/**
 * Parse a cURL command into HTTP request parameters
 */
function parseCurl(curlCommand: string): Partial<HttpRequestFormValues> | null {
  try {
    // Remove line continuations and normalize whitespace
    const normalized = curlCommand
      .replace(/\\\n/g, " ")
      .replace(/\\\r\n/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    const result: Partial<HttpRequestFormValues> = {
      method: "GET",
      headers: [],
      queryParams: [],
      sendHeaders: false,
      sendQueryParams: false,
      sendBody: false,
    };

    // Extract method
    const methodMatch = normalized.match(/-X\s+['"]?(\w+)['"]?/i) ||
                        normalized.match(/--request\s+['"]?(\w+)['"]?/i);
    if (methodMatch) {
      result.method = methodMatch[1].toUpperCase() as HttpRequestFormValues["method"];
    }

    // Extract URL (handle both quoted and unquoted)
    let url = "";
    const quotedUrlMatch = normalized.match(/['"]([^'"]*https?:\/\/[^'"]+)['"]/);
    const unquotedUrlMatch = normalized.match(/(https?:\/\/[^\s]+)/);
    
    if (quotedUrlMatch) {
      url = quotedUrlMatch[1];
    } else if (unquotedUrlMatch) {
      url = unquotedUrlMatch[1];
    }

    // Parse URL and query params
    if (url) {
      try {
        const urlObj = new URL(url);
        result.endpoint = `${urlObj.origin}${urlObj.pathname}`;
        
        // Extract query params
        urlObj.searchParams.forEach((value, key) => {
          result.queryParams!.push({ key, value });
        });
        if (result.queryParams!.length > 0) {
          result.sendQueryParams = true;
        }
      } catch {
        result.endpoint = url;
      }
    }

    // Extract headers
    const headerRegex = /-H\s+['"]([^'"]+)['"]/gi;
    let headerMatch;
    while ((headerMatch = headerRegex.exec(normalized)) !== null) {
      const [key, ...valueParts] = headerMatch[1].split(":");
      if (key && valueParts.length > 0) {
        const value = valueParts.join(":").trim();
        
        // Check for authorization header
        if (key.toLowerCase() === "authorization") {
          if (value.toLowerCase().startsWith("bearer ")) {
            result.authentication = "bearer";
            result.authCredentials = {
              ...result.authCredentials,
              token: value.slice(7),
            };
          } else if (value.toLowerCase().startsWith("basic ")) {
            result.authentication = "basic";
            try {
              const decoded = atob(value.slice(6));
              const [username, password] = decoded.split(":");
              result.authCredentials = {
                ...result.authCredentials,
                username,
                password,
              };
            } catch {
              // Keep as raw value
            }
          }
        } else {
          result.headers!.push({ key: key.trim(), value });
        }
      }
    }
    if (result.headers!.length > 0) {
      result.sendHeaders = true;
    }

    // Extract body data
    const dataMatch = normalized.match(/-d\s+['"]([^'"]+)['"]/i) ||
                      normalized.match(/--data\s+['"]([^'"]+)['"]/i) ||
                      normalized.match(/--data-raw\s+['"]([^'"]+)['"]/i);
    if (dataMatch) {
      result.body = dataMatch[1];
      result.sendBody = true;
      // If no method specified but has body, default to POST
      if (!methodMatch) {
        result.method = "POST";
      }
    }

    return result;
  } catch (error) {
    console.error("Failed to parse cURL:", error);
    return null;
  }
}

export const HttpRequestDialog = ({
  open,
  onOpenChange,
  onSubmit,
  defaultValues = {},
  workflowVariables = [],
  currentNodeId,
}: Props) => {
  const dialogContentRef = useRef<HTMLDivElement>(null);
  const [curlDialogOpen, setCurlDialogOpen] = useState(false);
  const [curlInput, setCurlInput] = useState("");
  const [isTestRunning, setIsTestRunning] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    status?: number;
    statusText?: string;
    headers?: Record<string, string>;
    data?: unknown;
    error?: string;
  } | null>(null);
  
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      variableName: defaultValues.variableName || "",
      endpoint: defaultValues.endpoint || "",
      method: defaultValues.method || "GET",
      body: defaultValues.body || "",
      bodyContentType: defaultValues.bodyContentType || "json",
      specifyBody: defaultValues.specifyBody || "raw",
      bodyParameters: defaultValues.bodyParameters || [],
      headers: defaultValues.headers || [],
      queryParams: defaultValues.queryParams || [],
      sendQueryParams: defaultValues.sendQueryParams || false,
      sendHeaders: defaultValues.sendHeaders || false,
      sendBody: defaultValues.sendBody || false,
      authentication: defaultValues.authentication || "none",
      authCredentials: defaultValues.authCredentials || {},
    },
  });

  // Reset form values when dialog opens with new defaults
  useEffect(() => {
    if (open) {
      setTestResult(null); // Clear test results when dialog opens
      form.reset({
        variableName: defaultValues.variableName || "",
        endpoint: defaultValues.endpoint || "",
        method: defaultValues.method || "GET",
        body: defaultValues.body || "",
        bodyContentType: defaultValues.bodyContentType || "json",
        specifyBody: defaultValues.specifyBody || "raw",
        bodyParameters: defaultValues.bodyParameters || [],
        headers: defaultValues.headers || [],
        queryParams: defaultValues.queryParams || [],
        sendQueryParams: defaultValues.sendQueryParams || false,
        sendHeaders: defaultValues.sendHeaders || false,
        sendBody: defaultValues.sendBody || false,
        authentication: defaultValues.authentication || "none",
        authCredentials: defaultValues.authCredentials || {},
      });
    }
  }, [open, defaultValues, form]);

  const rawVariableName = form.watch("variableName");
  const trimmedVariableName = rawVariableName?.trim();
  const watchVariableName = trimmedVariableName || "myApiCall";
  const watchMethod = form.watch("method");
  const watchSendBody = form.watch("sendBody");
  const watchSendHeaders = form.watch("sendHeaders");
  const watchSendQueryParams = form.watch("sendQueryParams");
  const watchAuthentication = form.watch("authentication");
  const watchHeaders = form.watch("headers") || [];
  const watchQueryParams = form.watch("queryParams") || [];
  const watchBodyContentType = form.watch("bodyContentType") || "json";
  const watchSpecifyBody = form.watch("specifyBody") || "raw";
  const watchBodyParameters = form.watch("bodyParameters") || [];

  const showBodyField = ["POST", "PUT", "PATCH"].includes(watchMethod) && watchSendBody;

  const handleSubmit = (values: z.infer<typeof formSchema>) => {
    onSubmit(values);
    onOpenChange(false);
  };

  const handleImportCurl = () => {
    const parsed = parseCurl(curlInput);
    if (parsed) {
      // Keep existing variable name
      const currentVarName = form.getValues("variableName");
      form.reset({
        ...form.getValues(),
        ...parsed,
        variableName: currentVarName || parsed.variableName || "",
      });
      setCurlDialogOpen(false);
      setCurlInput("");
      toast.success("cURL imported successfully");
    } else {
      toast.error("Failed to parse cURL command");
    }
  };

  const addHeader = () => {
    const current = form.getValues("headers") || [];
    form.setValue("headers", [...current, { key: "", value: "" }]);
  };

  const removeHeader = (index: number) => {
    const current = form.getValues("headers") || [];
    form.setValue("headers", current.filter((_, i) => i !== index));
  };

  const addQueryParam = () => {
    const current = form.getValues("queryParams") || [];
    form.setValue("queryParams", [...current, { key: "", value: "" }]);
  };

  const removeQueryParam = (index: number) => {
    const current = form.getValues("queryParams") || [];
    form.setValue("queryParams", current.filter((_, i) => i !== index));
  };

  const addBodyParameter = () => {
    const current = form.getValues("bodyParameters") || [];
    form.setValue("bodyParameters", [...current, { key: "", value: "" }]);
  };

  const removeBodyParameter = (index: number) => {
    const current = form.getValues("bodyParameters") || [];
    form.setValue("bodyParameters", current.filter((_, i) => i !== index));
  };

  const handleTestRequest = async () => {
    const values = form.getValues();
    
    if (!values.endpoint) {
      toast.error("Please enter a URL first");
      return;
    }

    setIsTestRunning(true);
    setTestResult(null);

    try {
      const result = await testHttpRequest({
        endpoint: values.endpoint,
        method: values.method,
        body: values.body,
        bodyContentType: values.bodyContentType,
        specifyBody: values.specifyBody,
        bodyParameters: values.bodyParameters,
        headers: values.headers,
        queryParams: values.queryParams,
        sendQueryParams: values.sendQueryParams,
        sendHeaders: values.sendHeaders,
        sendBody: values.sendBody,
        authentication: values.authentication,
        authCredentials: values.authCredentials,
      });

      setTestResult(result);
      
      if (result.success) {
        toast.success(`Request successful (${result.status})`);
      } else if (result.error) {
        toast.error(`Request failed: ${result.error}`);
      } else {
        toast.warning(`Request returned ${result.status}: ${result.statusText}`);
      }
    } catch (error) {
      toast.error("Failed to execute test request");
      setTestResult({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setIsTestRunning(false);
    }
  };

  return (
    <>
      {/* cURL Import Dialog */}
      <Dialog open={curlDialogOpen} onOpenChange={setCurlDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Import cURL</DialogTitle>
            <DialogDescription>
              Paste a cURL command to automatically configure the HTTP request.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder={`curl -X POST 'https://api.example.com/data' \\
  -H 'Content-Type: application/json' \\
  -H 'Authorization: Bearer token123' \\
  -d '{"key": "value"}'`}
            value={curlInput}
            onChange={(e) => setCurlInput(e.target.value)}
            className="min-h-[150px] font-mono text-sm"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setCurlDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleImportCurl}>
              Import
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfigurationPanelLayout
        open={open}
        onOpenChange={onOpenChange}
        workflowVariables={workflowVariables}
        currentNodeId={currentNodeId}
        dialogContentRef={dialogContentRef}
      >
        <ConfigDialogHeader>
          <div className="flex items-center justify-between pr-24">
            <ConfigDialogTitle>HTTP Request</ConfigDialogTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurlDialogOpen(true)}
              className="gap-2"
            >
              <Import className="size-4" />
              Import cURL
            </Button>
          </div>
          <ConfigDialogDescription>
            Configure settings for the HTTP Request node.
          </ConfigDialogDescription>
        </ConfigDialogHeader>
        <div className="mt-4 flex flex-col gap-6">
          <div>
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
                        <Input placeholder="MyAPICall" {...field} />
                      </FormControl>
                      <FormDescription className="text-sm text-muted-foreground">
                        Use this name to access the response elsewhere, e.g.{" "}
                        <code className="font-mono text-xs">{`{{${watchVariableName}.httpResponse.data}}`}</code>
                      </FormDescription>
                      {trimmedVariableName ? (
                        <div className="rounded-md border bg-muted/40 p-3">
                          <p className="text-xs font-medium text-muted-foreground mb-2">
                            Outputs generated by this node
                          </p>
                          <VariableTokenList
                            variables={getHttpRequestVariables(trimmedVariableName)}
                            emptyMessage=""
                          />
                        </div>
                      ) : null}
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className="flex gap-3">
                  <FormField
                    control={form.control}
                    name="method"
                    render={({ field }) => (
                      <FormItem className="w-[140px]">
                        <FormLabel>Method</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Select" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="GET">GET</SelectItem>
                            <SelectItem value="POST">POST</SelectItem>
                            <SelectItem value="PUT">PUT</SelectItem>
                            <SelectItem value="PATCH">PATCH</SelectItem>
                            <SelectItem value="DELETE">DELETE</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="endpoint"
                    render={({ field }) => (
                      <FormItem className="flex-1">
                        <FormLabel>URL</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="https://api.example.com/endpoint"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Authentication */}
                <FormField
                  control={form.control}
                  name="authentication"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Authentication</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || "none"}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select authentication type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="none">None</SelectItem>
                          <SelectItem value="basic">Basic Auth</SelectItem>
                          <SelectItem value="bearer">Bearer Token</SelectItem>
                          <SelectItem value="api_key">API Key</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {watchAuthentication === "basic" && (
                  <div className="space-y-3 rounded-md border p-4">
                    <FormField
                      control={form.control}
                      name="authCredentials.username"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Username</FormLabel>
                          <FormControl>
                            <Input placeholder="username" {...field} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="authCredentials.password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Password</FormLabel>
                          <FormControl>
                            <Input type="password" placeholder="password" {...field} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                )}

                {watchAuthentication === "bearer" && (
                  <div className="rounded-md border p-4">
                    <FormField
                      control={form.control}
                      name="authCredentials.token"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Bearer Token</FormLabel>
                          <FormControl>
                            <Input type="password" placeholder="your-token" {...field} />
                          </FormControl>
                          <FormDescription>
                            Supports variables: {`{{previousNode.token}}`}
                          </FormDescription>
                        </FormItem>
                      )}
                    />
                  </div>
                )}

                {watchAuthentication === "api_key" && (
                  <div className="space-y-3 rounded-md border p-4">
                    <FormField
                      control={form.control}
                      name="authCredentials.apiKeyHeader"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Header Name</FormLabel>
                          <FormControl>
                            <Input placeholder="X-API-Key" {...field} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="authCredentials.apiKey"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>API Key</FormLabel>
                          <FormControl>
                            <Input type="password" placeholder="your-api-key" {...field} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                )}

                {/* Send Query Parameters */}
                <div className="flex items-center justify-between">
                  <Label htmlFor="sendQueryParams">Send Query Parameters</Label>
                  <Switch
                    id="sendQueryParams"
                    checked={watchSendQueryParams}
                    onCheckedChange={(checked) => form.setValue("sendQueryParams", checked)}
                  />
                </div>

                {watchSendQueryParams && (
                  <div className="space-y-3 rounded-md border p-4">
                    {watchQueryParams.map((_, index) => (
                      <div key={index} className="flex gap-2 items-end">
                        <FormField
                          control={form.control}
                          name={`queryParams.${index}.key`}
                          render={({ field }) => (
                            <FormItem className="flex-1">
                              {index === 0 && <FormLabel>Name</FormLabel>}
                              <FormControl>
                                <Input placeholder="key" {...field} />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name={`queryParams.${index}.value`}
                          render={({ field }) => (
                            <FormItem className="flex-1">
                              {index === 0 && <FormLabel>Value</FormLabel>}
                              <FormControl>
                                <Input placeholder="value" {...field} />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeQueryParam(index)}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    ))}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={addQueryParam}
                      className="gap-2"
                    >
                      <Plus className="size-4" />
                      Add Parameter
                    </Button>
                  </div>
                )}

                {/* Send Headers */}
                <div className="flex items-center justify-between">
                  <Label htmlFor="sendHeaders">Send Headers</Label>
                  <Switch
                    id="sendHeaders"
                    checked={watchSendHeaders}
                    onCheckedChange={(checked) => form.setValue("sendHeaders", checked)}
                  />
                </div>

                {watchSendHeaders && (
                  <div className="space-y-3 rounded-md border p-4">
                    {watchHeaders.map((_, index) => (
                      <div key={index} className="flex gap-2 items-end">
                        <FormField
                          control={form.control}
                          name={`headers.${index}.key`}
                          render={({ field }) => (
                            <FormItem className="flex-1">
                              {index === 0 && <FormLabel>Name</FormLabel>}
                              <FormControl>
                                <Input placeholder="Content-Type" {...field} />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name={`headers.${index}.value`}
                          render={({ field }) => (
                            <FormItem className="flex-1">
                              {index === 0 && <FormLabel>Value</FormLabel>}
                              <FormControl>
                                <Input placeholder="application/json" {...field} />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeHeader(index)}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    ))}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={addHeader}
                      className="gap-2"
                    >
                      <Plus className="size-4" />
                      Add Header
                    </Button>
                  </div>
                )}

                {/* Send Body */}
                {["POST", "PUT", "PATCH"].includes(watchMethod) && (
                  <>
                    <div className="flex items-center justify-between">
                      <Label htmlFor="sendBody">Send Body</Label>
                      <Switch
                        id="sendBody"
                        checked={watchSendBody}
                        onCheckedChange={(checked) => form.setValue("sendBody", checked)}
                      />
                    </div>

                    {watchSendBody && (
                      <div className="space-y-4 rounded-md border p-4">
                        {/* Body Content Type */}
                        <FormField
                          control={form.control}
                          name="bodyContentType"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Body Content Type</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value || "json"}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select content type" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="json">JSON</SelectItem>
                                  <SelectItem value="form-urlencoded">Form URL Encoded</SelectItem>
                                  <SelectItem value="form-data">Multipart Form Data</SelectItem>
                                  <SelectItem value="raw">Raw</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        {/* Specify Body Method */}
                        <FormField
                          control={form.control}
                          name="specifyBody"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Specify Body</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value || "raw"}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select how to specify body" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="fields">Using Fields Below</SelectItem>
                                  <SelectItem value="raw">Using Raw JSON/Text</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        {/* Body Parameters (when using fields) */}
                        {watchSpecifyBody === "fields" && (
                          <div className="space-y-3">
                            <Label>Body Parameters</Label>
                            {watchBodyParameters.map((_, index) => (
                              <div key={index} className="flex gap-2 items-end">
                                <FormField
                                  control={form.control}
                                  name={`bodyParameters.${index}.key`}
                                  render={({ field }) => (
                                    <FormItem className="flex-1">
                                      {index === 0 && <FormLabel>Name</FormLabel>}
                                      <FormControl>
                                        <Input placeholder="key" {...field} />
                                      </FormControl>
                                    </FormItem>
                                  )}
                                />
                                <FormField
                                  control={form.control}
                                  name={`bodyParameters.${index}.value`}
                                  render={({ field }) => (
                                    <FormItem className="flex-1">
                                      {index === 0 && <FormLabel>Value</FormLabel>}
                                      <FormControl>
                                        <Input placeholder="value or {{variable}}" {...field} />
                                      </FormControl>
                                    </FormItem>
                                  )}
                                />
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => removeBodyParameter(index)}
                                >
                                  <Trash2 className="size-4" />
                                </Button>
                              </div>
                            ))}
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={addBodyParameter}
                              className="gap-2"
                            >
                              <Plus className="size-4" />
                              Add Parameter
                            </Button>
                          </div>
                        )}

                        {/* Raw Body (when using raw) */}
                        {watchSpecifyBody === "raw" && (
                          <FormField
                            control={form.control}
                            name="body"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Request Body</FormLabel>
                                <FormControl>
                                  <Textarea
                                    placeholder={`{\n  "userId": "{{httpResponse.data.id}}",\n  "name": "{{httpResponse.data.name}}"\n}`}
                                    className="min-h-[120px] font-mono text-sm"
                                    {...field}
                                  />
                                </FormControl>
                                <FormDescription>
                                  Use {`{{variables}}`} for simple values or {`{{json variable}}`} to stringify objects
                                </FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        )}
                      </div>
                    )}
                  </>
                )}

                {/* Test Request Section */}
                <div className="space-y-3">
                  <Label className="text-sm font-medium">Test Request</Label>
                  <div className="rounded-md border p-4 space-y-4">
                    <p className="text-xs text-muted-foreground">
                      Execute a test request with the current configuration. Note: Variables ({"{{...}}"}) won't be replaced in test mode.
                    </p>
                    
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={handleTestRequest}
                      disabled={isTestRunning || !form.watch("endpoint")}
                      className="gap-2"
                    >
                      {isTestRunning ? (
                        <>
                          <Loader2 className="size-4 animate-spin" />
                          Executing...
                        </>
                      ) : (
                        <>
                          <Play className="size-4" />
                          Test Request
                        </>
                      )}
                    </Button>

                    {testResult && (
                      <div className="space-y-3">
                        <div className={`flex items-center gap-2 text-sm ${testResult.success ? "text-[#0021F3] dark:text-[#5C70EA]" : "text-red-600 dark:text-red-400"}`}>
                          {testResult.success ? (
                            <>
                              <CheckCircle2 className="size-4" />
                              Success ({testResult.status} {testResult.statusText})
                            </>
                          ) : (
                            <>
                              <XCircle className="size-4" />
                              {testResult.error || `Error (${testResult.status} ${testResult.statusText})`}
                            </>
                          )}
                        </div>
                        
                        {testResult.data !== undefined && (
                          <div className="space-y-2">
                            <Label className="text-xs">Response Data</Label>
                            <pre className="rounded-md border bg-muted p-3 text-xs font-mono overflow-x-auto max-h-48 overflow-y-auto">
                              {typeof testResult.data === "string" 
                                ? testResult.data 
                                : JSON.stringify(testResult.data, null, 2)}
                            </pre>
                          </div>
                        )}

                        {testResult.headers && (
                          <details className="text-xs">
                            <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                              Response Headers
                            </summary>
                            <pre className="mt-2 rounded-md border bg-muted p-3 font-mono overflow-x-auto max-h-32 overflow-y-auto">
                              {JSON.stringify(testResult.headers, null, 2)}
                            </pre>
                          </details>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <ConfigDialogFooter className="mt-4">
                  <Button type="submit">Save</Button>
                </ConfigDialogFooter>
              </form>
            </Form>
          </div>
        </div>
      </ConfigurationPanelLayout>
    </>
  );
};
