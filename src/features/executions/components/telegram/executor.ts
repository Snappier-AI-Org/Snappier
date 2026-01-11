import type { NodeExecutor } from "@/features/executions/types";
import { NonRetriableError } from "inngest";
import { telegramChannel } from "@/inngest/channels/telegram";
import ky from "ky";
import { parseError } from "@/features/executions/lib/error-parser";
import { processTemplate, debugTemplateContext } from "@/features/executions/lib/handlebars-utils";

type TelegramData = {
  variableName?: string;
  botToken?: string;
  chatId?: string;
  content?: string;
  parseMode?: "HTML" | "Markdown" | "MarkdownV2" | "None";
};

export const telegramExecutor: NodeExecutor<TelegramData> = async ({
  data,
  nodeId,
  context,
  userId,
  step,
  publish,
}) => {
  console.log(`[Telegram Node ${nodeId}] Starting execution`, { nodeId, hasBotToken: !!data.botToken, hasChatId: !!data.chatId, hasContent: !!data.content });
  
  await publish(
    telegramChannel().status({
      nodeId,
      status: "loading",
    })
  );

  if (!data.variableName) {
    const errorMsg = "Variable name is missing";
    console.error(`[Telegram Node ${nodeId}] Error: ${errorMsg}`);
    const parsedError = parseError(new Error(errorMsg));
    await publish(
      telegramChannel().status({
        nodeId,
        status: "error",
      })
    );
    throw new NonRetriableError(
      `${parsedError.message}. ${parsedError.guidance}`
    );
  }
  
  // Store validated variableName for type narrowing
  const variableName = data.variableName;

  if (!data.botToken) {
    const errorMsg = "Bot token is required";
    console.error(`[Telegram Node ${nodeId}] Error: ${errorMsg}`);
    const parsedError = parseError(new Error(errorMsg));
    await publish(
      telegramChannel().status({
        nodeId,
        status: "error",
      }),
    );
    throw new NonRetriableError(
      `${parsedError.message}. ${parsedError.guidance}`
    );
  }

  if (!data.chatId) {
    const errorMsg = "Chat ID is required";
    console.error(`[Telegram Node ${nodeId}] Error: ${errorMsg}`);
    const parsedError = parseError(new Error(errorMsg));
    await publish(
      telegramChannel().status({
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
    console.error(`[Telegram Node ${nodeId}] Error: ${errorMsg}`);
    const parsedError = parseError(new Error(errorMsg));
    await publish(
      telegramChannel().status({
        nodeId,
        status: "error",
      })
    );
    throw new NonRetriableError(
      `${parsedError.message}. ${parsedError.guidance}`
    );
  }

  // Debug log to help trace variable interpolation issues
  debugTemplateContext("Telegram Node", data.content, context);

  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/409f2c88-a960-40ed-8c60-3380a93586bf',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'telegram/executor.ts:97',message:'Telegram pre-processTemplate',data:{rawContent:data.content,contextKeys:Object.keys(context),contextSnapshot:JSON.stringify(context).slice(0,1000)},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'B,C,D'})}).catch(()=>{});
  // #endregion

  const content = processTemplate(data.content, context);

  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/409f2c88-a960-40ed-8c60-3380a93586bf',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'telegram/executor.ts:102',message:'Telegram post-processTemplate',data:{rawContent:data.content,processedContent:content.slice(0,500),hasVariables:data.content?.includes('{{')},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'B,C,D'})}).catch(()=>{});
  let compiledChatId = processTemplate(data.chatId, context);
  const parseMode = data.parseMode || "HTML";
  
  // Normalize chat ID - remove any whitespace and ensure it's a string
  const originalChatId = compiledChatId;
  compiledChatId = String(compiledChatId).trim();
  
  // Log the chat ID transformation
  console.log(`[Telegram Node ${nodeId}] Chat ID processing:`, {
    originalChatId,
    compiledChatId,
    originalType: typeof originalChatId,
    compiledType: typeof compiledChatId,
    isNumeric: /^-?\d+$/.test(compiledChatId),
    startsWithAt: compiledChatId.startsWith('@'),
    contentLength: content.length,
    parseMode,
    hasContent: !!content,
    botTokenPreview: data.botToken ? `${data.botToken.substring(0, 10)}...` : 'missing'
  });

  try {
    console.log(`[Telegram Node ${nodeId}] Sending message to Telegram API`, { chatId: compiledChatId, contentLength: content.length, parseMode });
    
    const result = await step.run("telegram-send-message", async () => {
      console.log(`[Telegram Node ${nodeId}] Inside step.run callback, preparing API call`);
      const apiUrl = `https://api.telegram.org/bot${data.botToken}/sendMessage`;
      console.log(`[Telegram Node ${nodeId}] API URL prepared:`, apiUrl.replace(data.botToken!, "***"));

      try {
        // Prepare the request payload
        const payload: {
          chat_id: string | number;
          text: string;
          parse_mode?: string;
        } = {
          chat_id: compiledChatId,
          text: content.slice(0, 4096), // Telegram's max message length
        };
        
        // Only include parse_mode if it's not "None"
        if (parseMode !== "None") {
          payload.parse_mode = parseMode;
        }
        
        // Try to convert chat_id to number if it's a numeric string (Telegram API prefers numbers for numeric IDs)
        // But keep as string if it starts with @ (username) or - (group/channel)
        if (/^-?\d+$/.test(compiledChatId)) {
          payload.chat_id = parseInt(compiledChatId, 10);
          console.log(`[Telegram Node ${nodeId}] Converted chat_id to number:`, payload.chat_id);
        } else {
          console.log(`[Telegram Node ${nodeId}] Keeping chat_id as string:`, compiledChatId);
        }
        
        console.log(`[Telegram Node ${nodeId}] Sending request to Telegram API:`, {
          url: apiUrl.replace(data.botToken!, "***"),
          payload: {
            ...payload,
            text: payload.text.substring(0, 50) + (payload.text.length > 50 ? "..." : "")
          }
        });
        
        // Use throwHttpErrors: false to manually handle errors and extract Telegram API error messages
        console.log(`[Telegram Node ${nodeId}] Making HTTP request to Telegram API...`);
        const response = await ky.post(apiUrl, {
          json: payload,
          throwHttpErrors: false, // Don't throw on HTTP errors, we'll handle them manually
        });
        console.log(`[Telegram Node ${nodeId}] Received HTTP response, status:`, response.status);
        
        // Get response text first to see raw response
        const responseText = await response.text();
        console.log(`[Telegram Node ${nodeId}] Telegram API raw response:`, {
          status: response.status,
          statusText: response.statusText,
          headers: Object.fromEntries(response.headers.entries()),
          body: responseText.substring(0, 1000) // Limit to first 1000 chars
        });
        
        let responseData: { 
          ok: boolean; 
          result?: { 
            message_id: number;
            chat?: {
              id: number | string;
              type: string;
              username?: string;
              first_name?: string;
              last_name?: string;
              title?: string;
            };
            text?: string;
            date?: number;
          }; 
          description?: string; 
          error_code?: number;
        };
        
        try {
          responseData = JSON.parse(responseText);
        } catch (parseError) {
          console.error(`[Telegram Node ${nodeId}] Failed to parse Telegram API response:`, {
            parseError,
            responseText,
            status: response.status
          });
          throw new Error(`Invalid response from Telegram API: ${responseText.substring(0, 200)}`);
        }

        console.log(`[Telegram Node ${nodeId}] Telegram API parsed response:`, { 
          status: response.status,
          ok: responseData.ok, 
          messageId: responseData.result?.message_id, 
          description: responseData.description,
          error_code: responseData.error_code,
          hasResult: !!responseData.result,
          resultKeys: responseData.result ? Object.keys(responseData.result) : [],
          fullResponse: JSON.stringify(responseData, null, 2)
        });

        if (!responseData.ok || response.status !== 200) {
          // Telegram API returned an error response
          const errorCode = responseData.error_code || response.status;
          const errorDescription = responseData.description || response.statusText || "Failed to send Telegram message";
          const errorMsg = `Telegram API error (${errorCode}): ${errorDescription}`;
          console.error(`[Telegram Node ${nodeId}] Telegram API error:`, { 
            status: response.status,
            ok: responseData.ok, 
            description: responseData.description, 
            error_code: responseData.error_code,
            fullResponse: responseData
          });
          throw new Error(errorMsg);
        }

        // Verify that we actually got a message ID back (confirms message was sent)
        if (!responseData.result || !responseData.result.message_id) {
          const errorMsg = `Telegram API returned success but no message_id. Response: ${JSON.stringify(responseData)}`;
          console.error(`[Telegram Node ${nodeId}] ${errorMsg}`);
          throw new Error(errorMsg);
        }

        // Log detailed information about where the message was sent
        const result = responseData.result;
        console.log(`[Telegram Node ${nodeId}] Message sent successfully`, { 
          messageId: result.message_id,
          chatId: result.chat?.id,
          chatUsername: result.chat?.username,
          chatTitle: result.chat?.title,
          chatType: result.chat?.type,
          chatFirstName: result.chat?.first_name,
          chatLastName: result.chat?.last_name,
          requestedChatId: compiledChatId,
          chatIdMatch: String(result.chat?.id) === String(compiledChatId) || result.chat?.username === compiledChatId.replace('@', ''),
          text: result.text?.substring(0, 100),
          date: result.date,
          fullResult: JSON.stringify(result, null, 2)
        });
        
        // Warn if the chat ID doesn't match what was requested
        const chatIdMatches = String(result.chat?.id) === String(compiledChatId) || 
                              result.chat?.username === compiledChatId.replace('@', '') ||
                              (compiledChatId.startsWith('@') && result.chat?.username === compiledChatId.substring(1));
        
        if (!chatIdMatches) {
          console.warn(`[Telegram Node ${nodeId}] WARNING: Chat ID mismatch!`, {
            requestedChatId: compiledChatId,
            actualChatId: result.chat?.id,
            actualChatUsername: result.chat?.username,
            message: `Message was sent to chat ID ${result.chat?.id} (${result.chat?.username || result.chat?.title || 'unknown'}), but you requested ${compiledChatId}. Please verify your chat ID is correct.`
          });
        }
        return {
          ...context,
          [variableName]: {
            messageId: responseData.result?.message_id,
            messageContent: content.slice(0, 4096),
          },
        };
      } catch (kyError: unknown) {
        console.error(`[Telegram Node ${nodeId}] HTTP error occurred:`, kyError);
        
        // Handle ky HTTP errors - extract Telegram API error message
        if (kyError && typeof kyError === 'object' && 'response' in kyError) {
          const httpError = kyError as { response: Response };
          
          try {
            // Clone the response to avoid consuming it
            const responseClone = httpError.response.clone();
            let errorBody: { ok?: boolean; description?: string; error_code?: number } | null = null;
            
            try {
              errorBody = await responseClone.json() as { 
                ok: boolean; 
                description?: string; 
                error_code?: number;
              };
            } catch (jsonError) {
              // If JSON parsing fails, try to get text
              try {
                const text = await httpError.response.clone().text();
                console.error(`[Telegram Node ${nodeId}] Error response text:`, text);
                // Try to parse as JSON manually
                try {
                  errorBody = JSON.parse(text);
                } catch {
                  // If it's not JSON, create a structured error
                  errorBody = { description: text || httpError.response.statusText };
                }
              } catch (textError) {
                console.error(`[Telegram Node ${nodeId}] Failed to read error response:`, textError);
              }
            }
            
            console.error(`[Telegram Node ${nodeId}] Telegram API error response:`, { 
              status: httpError.response.status, 
              statusText: httpError.response.statusText,
              errorBody,
              errorBodyString: JSON.stringify(errorBody),
              headers: Object.fromEntries(httpError.response.headers.entries())
            });
            
            // Extract the actual error description from Telegram API
            let telegramErrorDescription = "";
            if (errorBody?.description) {
              telegramErrorDescription = errorBody.description;
            } else if (errorBody && typeof errorBody === 'object') {
              // Try to find description in nested structure
              const bodyStr = JSON.stringify(errorBody);
              const descMatch = bodyStr.match(/"description"\s*:\s*"([^"]+)"/i);
              if (descMatch) {
                telegramErrorDescription = descMatch[1];
              }
            }
            
            if (telegramErrorDescription) {
              // Include the actual Telegram API error description for better debugging
              const telegramError = `Telegram API error (${errorBody?.error_code || httpError.response.status}): ${telegramErrorDescription}`;
              console.error(`[Telegram Node ${nodeId}] Telegram API error details:`, telegramError);
              throw new Error(telegramError);
            } else if (errorBody) {
              // If we have errorBody but no description, include what we have
              const telegramError = `Telegram API error (${httpError.response.status}): ${JSON.stringify(errorBody)}`;
              console.error(`[Telegram Node ${nodeId}] Telegram API error (no description):`, telegramError);
              throw new Error(telegramError);
            } else {
              // Fallback to HTTP status
              throw new Error(`Telegram API error: HTTP ${httpError.response.status} ${httpError.response.statusText}`);
            }
          } catch (parseError) {
            console.error(`[Telegram Node ${nodeId}] Failed to parse error body:`, parseError);
            // If we can't parse the error body, use the HTTP status
            throw new Error(`Telegram API error: HTTP ${httpError.response.status} ${httpError.response.statusText}`);
          }
        }
        
        // Re-throw if it's not an HTTP error or we couldn't extract the message
        console.error(`[Telegram Node ${nodeId}] Re-throwing original error:`, kyError);
        throw kyError;
      }
    });

    await publish(
      telegramChannel().status({
        nodeId,
        status: "success",
      }),
    );
    console.log(`[Telegram Node ${nodeId}] Execution completed successfully`, {
      resultKeys: result ? Object.keys(result) : [],
      hasVariableName: !!data.variableName,
      variableName: data.variableName
    });
    return result;
  } catch (error) {
    // Extract the actual error message for better parsing
    let errorMessage = "Unknown error occurred";
    if (error instanceof Error) {
      errorMessage = error.message;
      console.error(`[Telegram Node ${nodeId}] Execution failed:`, {
        message: error.message,
        stack: error.stack,
        error: error
      });
    } else if (typeof error === 'string') {
      errorMessage = error;
      console.error(`[Telegram Node ${nodeId}] Execution failed with string error:`, error);
    } else {
      errorMessage = String(error);
      console.error(`[Telegram Node ${nodeId}] Execution failed with unknown error:`, error);
    }

    const parsedError = parseError(new Error(errorMessage));
    console.error(`[Telegram Node ${nodeId}] Parsed error:`, {
      message: parsedError.message,
      guidance: parsedError.guidance,
      errorCode: parsedError.errorCode,
      originalError: errorMessage
    });
    
    await publish(
      telegramChannel().status({
        nodeId,
        status: "error",
      }),
    );
    
    // Create a more helpful error message - include original error details if they add context
    // Extract just the core error message to avoid redundancy
    let fullErrorMessage = `${parsedError.message}. ${parsedError.guidance}`;
    
    // Only add original error if it provides additional context beyond the parsed message
    if (errorMessage && !errorMessage.includes(parsedError.message)) {
      // Extract the actual Telegram API error description if available
      const telegramErrorMatch = errorMessage.match(/Telegram API error[^:]*:\s*(.+)/i);
      if (telegramErrorMatch && telegramErrorMatch[1]) {
        fullErrorMessage += ` Details: ${telegramErrorMatch[1]}`;
      } else {
        fullErrorMessage += ` Details: ${errorMessage}`;
      }
    }
    
    console.error(`[Telegram Node ${nodeId}] Throwing NonRetriableError:`, fullErrorMessage);
    throw new NonRetriableError(fullErrorMessage);
  }
};

