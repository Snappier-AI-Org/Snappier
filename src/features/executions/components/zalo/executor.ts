import type { NodeExecutor } from "@/features/executions/types";
import { NonRetriableError } from "inngest";
import { zaloChannel } from "@/inngest/channels/zalo";
import ky from "ky";
import {
  processTemplate,
  debugTemplateContext,
} from "@/features/executions/lib/handlebars-utils";

type ZaloData = {
  variableName?: string;
  accessToken?: string;
  recipientId?: string;
  content?: string;
};

export const zaloExecutor: NodeExecutor<ZaloData> = async ({
  data,
  nodeId,
  context,
  userId,
  step,
  publish,
}) => {
  console.log(`[Zalo Bot ${nodeId}] Starting execution`, {
    nodeId,
    hasAccessToken: !!data.accessToken,
    hasRecipientId: !!data.recipientId,
    hasContent: !!data.content,
  });

  await publish(
    zaloChannel().status({
      nodeId,
      status: "loading",
    })
  );

  if (!data.variableName) {
    console.error(`[Zalo Bot ${nodeId}] Error: Variable name is missing`);
    await publish(
      zaloChannel().status({
        nodeId,
        status: "error",
      })
    );
    throw new NonRetriableError(
      "Zalo Bot: Variable name is required. Please configure a variable name in the Zalo Bot node settings."
    );
  }

  const variableName = data.variableName;

  if (!data.accessToken) {
    console.error(`[Zalo Bot ${nodeId}] Error: Access token is missing`);
    await publish(
      zaloChannel().status({
        nodeId,
        status: "error",
      })
    );
    throw new NonRetriableError(
      "Zalo Bot: Access token is required. Get your token from developers.zalo.me → Your Bot → Settings."
    );
  }

  if (!data.recipientId) {
    console.error(`[Zalo Bot ${nodeId}] Error: Recipient ID is missing`);
    await publish(
      zaloChannel().status({
        nodeId,
        status: "error",
      })
    );
    throw new NonRetriableError(
      "Zalo Bot: Recipient ID is required. Use {{webhook.payload.sender.id}} from a webhook trigger or enter a user ID manually."
    );
  }

  if (!data.content) {
    console.error(`[Zalo Bot ${nodeId}] Error: Message content is missing`);
    await publish(
      zaloChannel().status({
        nodeId,
        status: "error",
      })
    );
    throw new NonRetriableError(
      "Zalo Bot: Message content is required. Please enter a message to send."
    );
  }

  // Debug log to help trace variable interpolation issues
  debugTemplateContext("Zalo Bot", data.content, context);
  debugTemplateContext("Zalo Bot recipientId", data.recipientId, context);

  const content = processTemplate(data.content, context);
  const compiledRecipientId = processTemplate(data.recipientId, context);

  // Validate compiled values
  if (!compiledRecipientId || compiledRecipientId.trim() === "") {
    console.error(`[Zalo Bot ${nodeId}] Error: Chat ID resolved to empty value`, {
      originalValue: data.recipientId,
      compiledValue: compiledRecipientId,
      contextKeys: Object.keys(context || {}),
    });
    await publish(
      zaloChannel().status({
        nodeId,
        status: "error",
      })
    );
    throw new NonRetriableError(
      `Zalo Bot: Chat ID is empty after variable substitution. Original value: "${data.recipientId}". Make sure the webhook has triggered first and contains the expected data. Available context keys: ${Object.keys(context || {}).join(", ") || "none"}`
    );
  }

  console.log(`[Zalo Bot ${nodeId}] Sending message to Zalo Bot API`, {
    recipientId: compiledRecipientId,
    contentLength: content.length,
  });

  try {
    // Use step.run to ensure the API call is idempotent and only runs once
    const result = await step.run(`zalo-send-message-${nodeId}`, async () => {
      // Zalo Bot API endpoint - simpler than OA API
      const apiUrl = `https://bot-api.zaloplatforms.com/bot${data.accessToken}/sendMessage`;

      // Simple payload structure matching Zalo Bot API
      const payload = {
        chat_id: compiledRecipientId,
        text: content,
      };

      console.log(`[Zalo Bot ${nodeId}] Sending request to Zalo Bot API:`, {
        url: apiUrl,
        chatId: compiledRecipientId,
        messagePreview: content.substring(0, 50) + (content.length > 50 ? "..." : ""),
      });

      const response = await fetch(apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const responseText = await response.text();
      let responseData: any;

      try {
        responseData = JSON.parse(responseText);
      } catch {
        responseData = { raw: responseText };
      }

      console.log(`[Zalo Bot ${nodeId}] Response:`, {
        status: response.status,
        statusText: response.statusText,
        data: responseData,
      });

      if (!response.ok) {
        // Parse Zalo Bot error response
        let errorMessage = `HTTP ${response.status}: ${response.statusText}`;

        if (responseData && typeof responseData === "object") {
          if (responseData.description) {
            errorMessage = responseData.description;
          } else if (responseData.error) {
            errorMessage = responseData.error;
          }

          // Common Zalo Bot errors
          if (errorMessage.includes("chat_id is invalid")) {
            errorMessage =
              "Invalid chat_id. Make sure you're using the correct chat ID from the webhook ({{webhook.payload.message.chat.id}})";
          } else if (errorMessage.includes("Unauthorized") || errorMessage.includes("token")) {
            errorMessage =
              "Invalid bot token. Check your token from developers.zalo.me → Your Bot → Settings → Bot Token";
          }
        }

        console.error(`[Zalo Bot ${nodeId}] API Error:`, errorMessage);
        throw new Error(`Zalo Bot API Error: ${errorMessage}`);
      }

      // Successful response
      return {
        messageId: responseData.message_id || responseData.result?.message_id,
        chatId: compiledRecipientId,
        ok: responseData.ok,
        responseJson: responseData,
      };
    });

    console.log(`[Zalo Bot ${nodeId}] Message sent successfully:`, result);

    await publish(
      zaloChannel().status({
        nodeId,
        status: "success",
      })
    );

    return {
      [variableName]: result,
    };
  } catch (error) {
    let errorMessage = "Unknown error occurred";
    if (error instanceof Error) {
      errorMessage = error.message;
      console.error(`[Zalo Bot ${nodeId}] Execution failed:`, {
        message: error.message,
        stack: error.stack,
      });
    } else if (typeof error === "string") {
      errorMessage = error;
    } else {
      errorMessage = String(error);
    }

    console.error(`[Zalo Bot ${nodeId}] Error details:`, errorMessage);

    await publish(
      zaloChannel().status({
        nodeId,
        status: "error",
      })
    );

    // Extract Zalo-specific error details if available
    const zaloErrorMatch = errorMessage.match(/Zalo Bot API error[^:]*:\s*(.+)/i);
    const details = zaloErrorMatch?.[1] || errorMessage;
    
    throw new NonRetriableError(`Zalo Bot Error: ${details}`);
  }
};


