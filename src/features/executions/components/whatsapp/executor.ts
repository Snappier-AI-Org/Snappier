import type { NodeExecutor } from "@/features/executions/types";
import { NonRetriableError } from "inngest";
import { whatsappChannel } from "@/inngest/channels/whatsapp";
import { parseError } from "@/features/executions/lib/error-parser";
import { processTemplate, debugTemplateContext } from "@/features/executions/lib/handlebars-utils";

type WhatsAppData = {
  variableName?: string;
  phoneNumber?: string;
  content?: string;
};

/**
 * WhatsApp Node Executor using whatsapp-web.js
 * 
 * IMPORTANT: This executor requires a WhatsApp Web session to be established.
 * The session management is handled by a separate WhatsApp client service.
 * 
 * For production use, you should:
 * 1. Run a separate WhatsApp client service that maintains the session
 * 2. Expose an API endpoint for sending messages
 * 3. Call that API from this executor
 * 
 * For development/prototype:
 * - Set WHATSAPP_API_URL in your .env file pointing to your WhatsApp service
 */
export const whatsappExecutor: NodeExecutor<WhatsAppData> = async ({
  data,
  nodeId,
  context,
  userId,
  step,
  publish,
}) => {
  console.log(`[WhatsApp Node ${nodeId}] Starting execution`, { 
    nodeId, 
    hasPhoneNumber: !!data.phoneNumber, 
    hasContent: !!data.content 
  });
  
  await publish(
    whatsappChannel().status({
      nodeId,
      status: "loading",
    })
  );

  if (!data.variableName) {
    const errorMsg = "Variable name is missing";
    console.error(`[WhatsApp Node ${nodeId}] Error: ${errorMsg}`);
    const parsedError = parseError(new Error(errorMsg));
    await publish(
      whatsappChannel().status({
        nodeId,
        status: "error",
      })
    );
    throw new NonRetriableError(
      `${parsedError.message}. ${parsedError.guidance}`
    );
  }
  
  const variableName = data.variableName;

  if (!data.phoneNumber) {
    const errorMsg = "Phone number is required";
    console.error(`[WhatsApp Node ${nodeId}] Error: ${errorMsg}`);
    const parsedError = parseError(new Error(errorMsg));
    await publish(
      whatsappChannel().status({
        nodeId,
        status: "error",
      }),
    );
    throw new NonRetriableError(
      `${parsedError.message}. ${parsedError.guidance}`
    );
  }

  if (!data.content) {
    const errorMsg = "Message content is missing";
    console.error(`[WhatsApp Node ${nodeId}] Error: ${errorMsg}`);
    const parsedError = parseError(new Error(errorMsg));
    await publish(
      whatsappChannel().status({
        nodeId,
        status: "error",
      })
    );
    throw new NonRetriableError(
      `${parsedError.message}. ${parsedError.guidance}`
    );
  }

  // Check for WhatsApp API URL
  const whatsappApiUrl = process.env.WHATSAPP_API_URL;
  if (!whatsappApiUrl) {
    const errorMsg = "WHATSAPP_API_URL environment variable is not set. Please configure your WhatsApp service.";
    console.error(`[WhatsApp Node ${nodeId}] Error: ${errorMsg}`);
    const parsedError = parseError(new Error(errorMsg));
    await publish(
      whatsappChannel().status({
        nodeId,
        status: "error",
      })
    );
    throw new NonRetriableError(
      `${parsedError.message}. ${parsedError.guidance}`
    );
  }

  // Debug log to help trace variable interpolation issues
  debugTemplateContext("WhatsApp Node", data.content, context);

  const content = processTemplate(data.content, context);
  const phoneNumber = processTemplate(data.phoneNumber, context);
  
  // Normalize phone number - remove any non-digit characters
  const normalizedPhone = String(phoneNumber).replace(/\D/g, '');
  
  console.log(`[WhatsApp Node ${nodeId}] Phone number processing:`, {
    originalPhone: phoneNumber,
    normalizedPhone,
    contentLength: content.length,
    hasContent: !!content,
  });

  try {
    console.log(`[WhatsApp Node ${nodeId}] Sending message to WhatsApp API`);
    
    const result = await step.run("whatsapp-send-message", async () => {
      console.log(`[WhatsApp Node ${nodeId}] Inside step.run callback, preparing API call`);

      // Format the chat ID for whatsapp-web.js
      // Phone numbers need @c.us suffix for individual chats
      const chatId = `${normalizedPhone}@c.us`;
      
      const payload = {
        chatId,
        message: content.slice(0, 4096), // WhatsApp message length limit
      };
      
      console.log(`[WhatsApp Node ${nodeId}] Sending request to WhatsApp API:`, {
        url: whatsappApiUrl,
        chatId: payload.chatId,
        messageLength: payload.message.length,
      });
      
      const response = await fetch(`${whatsappApiUrl}/send-message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
      
      console.log(`[WhatsApp Node ${nodeId}] Received HTTP response, status:`, response.status);
      
      const responseText = await response.text();
      console.log(`[WhatsApp Node ${nodeId}] WhatsApp API raw response:`, {
        status: response.status,
        statusText: response.statusText,
        body: responseText.substring(0, 1000),
      });
      
      let responseData: {
        success: boolean;
        messageId?: string;
        error?: string;
        timestamp?: number;
      };
      
      try {
        responseData = JSON.parse(responseText);
      } catch (parseError) {
        console.error(`[WhatsApp Node ${nodeId}] Failed to parse WhatsApp API response:`, {
          parseError,
          responseText,
          status: response.status
        });
        throw new Error(`Invalid response from WhatsApp API: ${responseText.substring(0, 200)}`);
      }

      console.log(`[WhatsApp Node ${nodeId}] WhatsApp API parsed response:`, { 
        status: response.status,
        success: responseData.success, 
        messageId: responseData.messageId, 
        error: responseData.error,
      });

      if (!responseData.success || response.status !== 200) {
        const errorMsg = `WhatsApp API error: ${responseData.error || response.statusText || "Failed to send WhatsApp message"}`;
        console.error(`[WhatsApp Node ${nodeId}] WhatsApp API error:`, { 
          status: response.status,
          success: responseData.success, 
          error: responseData.error,
          fullResponse: responseData
        });
        throw new Error(errorMsg);
      }

      console.log(`[WhatsApp Node ${nodeId}] ✅ Message sent successfully!`, {
        messageId: responseData.messageId,
        chatId,
        timestamp: responseData.timestamp,
      });

      return {
        messageId: responseData.messageId,
        chatId,
        messageContent: content,
        timestamp: responseData.timestamp || Date.now(),
        phoneNumber: normalizedPhone,
      };
    });

    console.log(`[WhatsApp Node ${nodeId}] Step completed successfully`, result);

    await publish(
      whatsappChannel().status({
        nodeId,
        status: "success",
      })
    );

    return {
      [variableName]: result,
    };
  } catch (error) {
    console.error(`[WhatsApp Node ${nodeId}] Error sending message:`, error);
    const parsedError = parseError(error as Error);
    
    await publish(
      whatsappChannel().status({
        nodeId,
        status: "error",
      })
    );
    
    throw new NonRetriableError(
      `${parsedError.message}. ${parsedError.guidance}`
    );
  }
};
