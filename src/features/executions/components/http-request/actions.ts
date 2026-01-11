"use server";

import { getSubscriptionToken, type Realtime } from "@inngest/realtime";
import { httpRequestChannel } from "@/inngest/channels/http-request";
import { inngest } from "@/inngest/client";

export type HttpRequestToken = Realtime.Token<
  typeof httpRequestChannel,
  ["status"]
>;

export async function fetchHttpRequestRealtimeToken(): Promise<HttpRequestToken> {
  const token = await getSubscriptionToken(inngest, {
    channel: httpRequestChannel(),
    topics: ["status"],
  });

  return token;
}

// Types for test execution
type TestHttpRequestParams = {
  endpoint: string;
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
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

type TestHttpRequestResult = {
  success: boolean;
  status?: number;
  statusText?: string;
  headers?: Record<string, string>;
  data?: unknown;
  error?: string;
};

export async function testHttpRequest(params: TestHttpRequestParams): Promise<TestHttpRequestResult> {
  try {
    let endpoint = params.endpoint;

    // Build query parameters
    if (params.sendQueryParams && params.queryParams && params.queryParams.length > 0) {
      const url = new URL(endpoint);
      for (const param of params.queryParams) {
        if (param.key) {
          url.searchParams.append(param.key, param.value);
        }
      }
      endpoint = url.toString();
    }

    // Build headers
    const headers: Record<string, string> = {};

    // Add custom headers
    if (params.sendHeaders && params.headers) {
      for (const header of params.headers) {
        if (header.key) {
          headers[header.key] = header.value;
        }
      }
    }

    // Add authentication headers
    if (params.authentication && params.authentication !== "none" && params.authCredentials) {
      switch (params.authentication) {
        case "basic": {
          const username = params.authCredentials.username || "";
          const password = params.authCredentials.password || "";
          const encoded = Buffer.from(`${username}:${password}`).toString("base64");
          headers["Authorization"] = `Basic ${encoded}`;
          break;
        }
        case "bearer": {
          const token = params.authCredentials.token || "";
          headers["Authorization"] = `Bearer ${token}`;
          break;
        }
        case "api_key": {
          const headerName = params.authCredentials.apiKeyHeader || "X-API-Key";
          const apiKey = params.authCredentials.apiKey || "";
          headers[headerName] = apiKey;
          break;
        }
      }
    }

    const fetchOptions: RequestInit = {
      method: params.method,
      headers: Object.keys(headers).length > 0 ? headers : undefined,
    };

    // Add body for POST, PUT, PATCH
    if (["POST", "PUT", "PATCH"].includes(params.method) && params.sendBody) {
      const bodyContentType = params.bodyContentType || "json";
      const specifyBody = params.specifyBody || "raw";

      if (specifyBody === "fields" && params.bodyParameters && params.bodyParameters.length > 0) {
        // Build body from key/value parameters
        const bodyObj: Record<string, string> = {};
        for (const param of params.bodyParameters) {
          if (param.key) {
            bodyObj[param.key] = param.value;
          }
        }

        if (bodyContentType === "json") {
          fetchOptions.body = JSON.stringify(bodyObj);
          if (!headers["Content-Type"]) {
            headers["Content-Type"] = "application/json";
          }
        } else if (bodyContentType === "form-urlencoded") {
          const formData = new URLSearchParams();
          for (const [key, value] of Object.entries(bodyObj)) {
            formData.append(key, value);
          }
          fetchOptions.body = formData.toString();
          if (!headers["Content-Type"]) {
            headers["Content-Type"] = "application/x-www-form-urlencoded";
          }
        } else {
          fetchOptions.body = JSON.stringify(bodyObj);
        }
      } else if (params.body) {
        fetchOptions.body = params.body;
        if (bodyContentType === "json" && !headers["Content-Type"]) {
          headers["Content-Type"] = "application/json";
        } else if (bodyContentType === "form-urlencoded" && !headers["Content-Type"]) {
          headers["Content-Type"] = "application/x-www-form-urlencoded";
        }
      }

      fetchOptions.headers = headers;
    }

    const response = await fetch(endpoint, fetchOptions);
    const contentType = response.headers.get("content-type");
    const responseData = contentType?.includes("application/json")
      ? await response.json()
      : await response.text();

    const responseHeaders: Record<string, string> = {};
    response.headers.forEach((value, key) => {
      responseHeaders[key] = value;
    });

    return {
      success: response.ok,
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
      data: responseData,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}