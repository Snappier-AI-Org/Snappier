import type { NodeExecutor } from "@/features/executions/types";
import { NonRetriableError } from "inngest";
import ky, { type Options as KyOptions } from "ky";
import { httpRequestChannel } from "@/inngest/channels/http-request";
import { processTemplate, debugTemplateContext } from "@/features/executions/lib/handlebars-utils";

type HttpRequestData = {
  variableName?: string;
  endpoint?: string;
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: string;
  bodyContentType?: "json" | "form-urlencoded" | "form-data" | "raw";
  specifyBody?: "raw" | "fields";
  bodyParameters?: Array<{ key: string; value: string }>;
  headers?: Array<{ key: string; value: string }>;
  queryParams?: Array<{ key: string; value: string }>;
  sendQueryParams?: boolean;
  sendHeaders?: boolean;
  sendBody?: boolean;
  authentication?: "none" | "basic" | "bearer" | "api_key";
  authCredentials?: {
    username?: string;
    password?: string;
    token?: string;
    apiKey?: string;
    apiKeyHeader?: string;
  };
};

export const httpRequestExecutor: NodeExecutor<HttpRequestData> = async ({
  data,
  nodeId,
  context,
  step,
  publish,
}) => {
  await publish(
    httpRequestChannel().status({
      nodeId,
      status: "loading",
    })
  );

  try {
    const result = await step.run("http-request", async () => {
      if (!data.endpoint) {
        await publish(
          httpRequestChannel().status({
            nodeId,
            status: "error",
          })
        );
        throw new NonRetriableError("HTTP Request node: No endpoint configured");
      }

      if (!data.variableName) {
        await publish(
          httpRequestChannel().status({
            nodeId,
            status: "error",
          })
        );
        throw new NonRetriableError("HTTP Request node: Variable name not configured");
      }

      if (!data.method) {
        await publish(
          httpRequestChannel().status({
            nodeId,
            status: "error",
          })
        );
        throw new NonRetriableError("HTTP Request node: Method not configured");
      }

      // Debug log to help trace variable interpolation issues
      debugTemplateContext("HTTP Request Node", data.endpoint, context);

      let endpoint = processTemplate(data.endpoint, context);
      const method = data.method;

      // Build query parameters
      if (data.sendQueryParams && data.queryParams && data.queryParams.length > 0) {
        const url = new URL(endpoint);
        for (const param of data.queryParams) {
          if (param.key) {
            const processedValue = processTemplate(param.value, context);
            url.searchParams.append(param.key, processedValue);
          }
        }
        endpoint = url.toString();
      }

      // Build headers
      const headers: Record<string, string> = {};

      // Add custom headers
      if (data.sendHeaders && data.headers) {
        for (const header of data.headers) {
          if (header.key) {
            headers[header.key] = processTemplate(header.value, context);
          }
        }
      }

      // Add authentication headers
      if (data.authentication && data.authentication !== "none" && data.authCredentials) {
        switch (data.authentication) {
          case "basic": {
            const username = processTemplate(data.authCredentials.username || "", context);
            const password = processTemplate(data.authCredentials.password || "", context);
            const encoded = Buffer.from(`${username}:${password}`).toString("base64");
            headers["Authorization"] = `Basic ${encoded}`;
            break;
          }
          case "bearer": {
            const token = processTemplate(data.authCredentials.token || "", context);
            headers["Authorization"] = `Bearer ${token}`;
            break;
          }
          case "api_key": {
            const headerName = data.authCredentials.apiKeyHeader || "X-API-Key";
            const apiKey = processTemplate(data.authCredentials.apiKey || "", context);
            headers[headerName] = apiKey;
            break;
          }
        }
      }

      const options: KyOptions = {
        method,
        headers: Object.keys(headers).length > 0 ? headers : undefined,
      };

      // Add body for POST, PUT, PATCH
      if (["POST", "PUT", "PATCH"].includes(method) && data.sendBody) {
        const bodyContentType = data.bodyContentType || "json";
        const specifyBody = data.specifyBody || "raw";

        if (specifyBody === "fields" && data.bodyParameters && data.bodyParameters.length > 0) {
          // Build body from key/value parameters
          const bodyObj: Record<string, string> = {};
          for (const param of data.bodyParameters) {
            if (param.key) {
              bodyObj[param.key] = processTemplate(param.value, context);
            }
          }

          if (bodyContentType === "json") {
            options.body = JSON.stringify(bodyObj);
            if (!headers["Content-Type"]) {
              headers["Content-Type"] = "application/json";
              options.headers = headers;
            }
          } else if (bodyContentType === "form-urlencoded") {
            const formData = new URLSearchParams();
            for (const [key, value] of Object.entries(bodyObj)) {
              formData.append(key, value);
            }
            options.body = formData.toString();
            if (!headers["Content-Type"]) {
              headers["Content-Type"] = "application/x-www-form-urlencoded";
              options.headers = headers;
            }
          } else if (bodyContentType === "form-data") {
            // For form-data, we use the body object directly and let ky handle it
            // Note: ky doesn't directly support FormData in the same way, so we'll build it
            const formData = new FormData();
            for (const [key, value] of Object.entries(bodyObj)) {
              formData.append(key, value);
            }
            options.body = formData;
            // Don't set Content-Type for form-data, let the browser set it with boundary
            delete headers["Content-Type"];
            options.headers = headers;
          } else {
            // Raw - stringify the object
            options.body = JSON.stringify(bodyObj);
          }
        } else if (data.body) {
          // Use raw body
          const resolved = processTemplate(data.body, context);
          
          if (bodyContentType === "json") {
            try {
              // Try to parse as JSON to validate
              JSON.parse(resolved);
              options.body = resolved;
              if (!headers["Content-Type"]) {
                headers["Content-Type"] = "application/json";
                options.headers = headers;
              }
            } catch {
              // If not valid JSON, send as raw text
              options.body = resolved;
            }
          } else if (bodyContentType === "form-urlencoded") {
            options.body = resolved;
            if (!headers["Content-Type"]) {
              headers["Content-Type"] = "application/x-www-form-urlencoded";
              options.headers = headers;
            }
          } else {
            // Raw or other
            options.body = resolved;
          }
        }
      } else if (["POST", "PUT", "PATCH"].includes(method) && !data.sendBody) {
        // Legacy behavior: if sendBody is not explicitly set, try to use body field
        if (data.body) {
          const resolved = processTemplate(data.body, context);
          try {
            JSON.parse(resolved);
            options.body = resolved;
            if (!headers["Content-Type"]) {
              headers["Content-Type"] = "application/json";
              options.headers = headers;
            }
          } catch {
            options.body = resolved;
          }
        }
      }

      console.log(`[HTTP Request Node ${nodeId}] Making request:`, {
        method,
        endpoint,
        hasHeaders: Object.keys(headers).length > 0,
        hasBody: !!options.body,
      });

      const response = await ky(endpoint, options);
      const contentType = response.headers.get("content-type");
      const responseData = contentType?.includes("application/json")
        ? await response.json()
        : await response.text();

      const responsePayload = {
        httpResponse: {
          status: response.status,
          statusText: response.statusText,
          headers: Object.fromEntries(response.headers.entries()),
          data: responseData,
        },
      };

      return {
        ...context,
        [data.variableName]: responsePayload,
      };
    });

    await publish(
      httpRequestChannel().status({
        nodeId,
        status: "success",
      })
    );
    return result;
  } catch (error) {
    await publish(
      httpRequestChannel().status({
        nodeId,
        status: "error",
      })
    );
    throw error;
  }
};