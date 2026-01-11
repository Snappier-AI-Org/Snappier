/**
 * Parses errors and provides user-friendly messages with guidance
 */

export interface ParsedError {
  message: string;
  guidance?: string;
  fixSteps?: string[];
  errorCode?: string;
}

type LLMProvider = "openai" | "anthropic" | "gemini" | "groq" | "huggingface" | "openrouter";

interface ParseErrorOptions {
  provider?: LLMProvider;
}

const LLM_PROVIDER_DETAILS: Record<LLMProvider, {
  name: string;
  accountLabel: string;
  credentialLabel: string;
  nodeLabel: string;
  keyPortal: string;
  billingPortal: string;
  keyPrefixHint?: string;
  suggestedModel?: string;
}> = {
  openai: {
    name: "OpenAI",
    accountLabel: "OpenAI account",
    credentialLabel: "OpenAI credential",
    nodeLabel: "OpenAI node",
    keyPortal: "your OpenAI account settings",
    billingPortal: "the OpenAI billing page",
    keyPrefixHint: "sk-",
    suggestedModel: "GPT-4 or GPT-4o",
  },
  anthropic: {
    name: "Anthropic",
    accountLabel: "Anthropic Console",
    credentialLabel: "Anthropic credential",
    nodeLabel: "Anthropic node",
    keyPortal: "the Anthropic Console",
    billingPortal: "the Anthropic billing page",
    keyPrefixHint: "sk-ant-",
    suggestedModel: "Claude 3.5 Sonnet or Claude 3 Haiku",
  },
  gemini: {
    name: "Gemini",
    accountLabel: "Google AI Studio project",
    credentialLabel: "Gemini credential",
    nodeLabel: "Gemini node",
    keyPortal: "Google AI Studio",
    billingPortal: "the Google AI Studio billing page",
    keyPrefixHint: "AIza",
    suggestedModel: "Gemini 2.0 Flash",
  },
  groq: {
    name: "Groq",
    accountLabel: "Groq account",
    credentialLabel: "Groq credential",
    nodeLabel: "Groq node",
    keyPortal: "GroqCloud console (https://console.groq.com/keys)",
    billingPortal: "the Groq billing page",
    keyPrefixHint: "gsk_",
    suggestedModel: "Llama 3.3 70B or Mixtral 8x7B",
  },
  huggingface: {
    name: "Hugging Face",
    accountLabel: "Hugging Face account",
    credentialLabel: "Hugging Face credential",
    nodeLabel: "Hugging Face node",
    keyPortal: "Hugging Face settings (https://huggingface.co/settings/tokens)",
    billingPortal: "the Hugging Face billing page",
    keyPrefixHint: "hf_",
    suggestedModel: "Mistral 7B or Llama 3.1 8B",
  },
  openrouter: {
    name: "OpenRouter",
    accountLabel: "OpenRouter account",
    credentialLabel: "OpenRouter credential",
    nodeLabel: "OpenRouter node",
    keyPortal: "OpenRouter keys (https://openrouter.ai/keys)",
    billingPortal: "the OpenRouter billing page (https://openrouter.ai/credits)",
    keyPrefixHint: "sk-or-",
    suggestedModel: "openai/gpt-4o-mini or anthropic/claude-3-haiku",
  },
};

export function parseError(error: unknown, options: ParseErrorOptions = {}): ParsedError {
  const errorMessage = error instanceof Error ? error.message : String(error);
  const errorString = errorMessage.toLowerCase();
  const llmProvider = options.provider ?? "openai";
  const providerDetails = LLM_PROVIDER_DETAILS[llmProvider];

  // OpenAI API Errors
  if (errorString.includes("invalid_api_key") || errorString.includes("incorrect api key")) {
    const fixSteps = [
      `Go to ${providerDetails.keyPortal}`,
      "Navigate to the API keys section",
      "Create a new API key or copy an existing one",
      `Update your ${providerDetails.credentialLabel} in the Credentials page`,
    ];

    if (providerDetails.keyPrefixHint) {
      fixSteps.push(`Make sure the API key starts with '${providerDetails.keyPrefixHint}' or matches the expected prefix for this provider.`);
    }

    return {
      message: `Invalid ${providerDetails.name} API Key`,
      guidance: `Your ${providerDetails.name} API key is invalid or incorrect. Please verify your API key and try again.`,
      fixSteps,
      errorCode: "INVALID_API_KEY",
    };
  }

  if (errorString.includes("insufficient_quota") || errorString.includes("quota") || errorString.includes("billing")) {
    return {
      message: `${providerDetails.name} API Quota Exceeded`,
      guidance: `Your ${providerDetails.accountLabel} has insufficient credits or quota. Please add credits to your account.`,
      fixSteps: [
        `Go to ${providerDetails.billingPortal}`,
        "Add credits or increase the quota for the API",
        "Wait a few minutes for the changes to take effect",
        "Try executing the workflow again",
      ],
      errorCode: "INSUFFICIENT_QUOTA",
    };
  }

  if (errorString.includes("rate_limit") || errorString.includes("too many requests")) {
    return {
      message: `${providerDetails.name} API Rate Limit Exceeded`,
      guidance: `You've made too many requests to the ${providerDetails.name} API. Please wait a moment and try again.`,
      fixSteps: [
        "Wait 1-2 minutes before trying again",
        `Consider upgrading your ${providerDetails.accountLabel} plan for higher rate limits`,
        "Reduce the frequency of workflow executions",
      ],
      errorCode: "RATE_LIMIT",
    };
  }

  if (
    (errorString.includes("model") && (errorString.includes("not found") || errorString.includes("does not exist"))) ||
    errorString.includes("invalid model") ||
    errorString.includes("model_not_found") ||
    errorString.includes("model_id_invalid") ||
    (errorString.includes("unknown") && errorString.includes("model"))
  ) {
    return {
      message: `${providerDetails.name} Model Identifier Error`,
      guidance: `The requested ${providerDetails.name} model identifier is invalid or not available. This could be due to: model deprecation, incorrect model name, or access restrictions.`,
      fixSteps: [
        `Verify the model identifier is correct in your ${providerDetails.accountLabel}`,
        `Check ${providerDetails.keyPortal} for the latest available model names`,
        providerDetails.suggestedModel
          ? `Try using a supported model (e.g., ${providerDetails.suggestedModel})`
          : "Try using a different model from the available list",
        `Ensure your ${providerDetails.accountLabel} has access to the requested model`,
        "If the model was recently released, verify it's available in your region/account tier",
      ],
      errorCode: "MODEL_NOT_FOUND",
    };
  }

  // Credential Errors
  if (errorString.includes("credential not found") || errorString.includes("credential is required")) {
    return {
      message: `${providerDetails.name} Credential Not Configured`,
      guidance: `The ${providerDetails.nodeLabel} requires a credential to be set up. Please configure your ${providerDetails.name} API key.`,
      fixSteps: [
        `Double-click the ${providerDetails.nodeLabel} to open settings`,
        `Select or create a ${providerDetails.credentialLabel}`,
        "Make sure the credential has a valid API key",
        "Save the node configuration",
      ],
      errorCode: "CREDENTIAL_NOT_FOUND",
    };
  }

  if (errorString.includes("variable name is missing")) {
    return {
      message: "Variable Name Not Set",
      guidance: `The ${providerDetails.nodeLabel} requires a variable name to store the result.`,
      fixSteps: [
        `Double-click the ${providerDetails.nodeLabel} to open settings`,
        "Enter a variable name (e.g., 'response', 'result')",
        "Save the node configuration",
      ],
      errorCode: "VARIABLE_NAME_MISSING",
    };
  }

  if (errorString.includes("user prompt is missing")) {
    return {
      message: "User Prompt Not Set",
      guidance: `The ${providerDetails.nodeLabel} requires a user prompt to generate a response.`,
      fixSteps: [
        `Double-click the ${providerDetails.nodeLabel} to open settings`,
        "Enter a user prompt in the 'User Prompt' field",
        "Save the node configuration",
      ],
      errorCode: "USER_PROMPT_MISSING",
    };
  }

  // Decryption Errors
  if (errorString.includes("decrypt") || errorString.includes("decryption")) {
    return {
      message: "Credential Decryption Failed",
      guidance: `There was an issue decrypting your ${providerDetails.credentialLabel}. This might indicate the credential was corrupted.`,
      fixSteps: [
        "Go to the Credentials page",
        `Delete the existing ${providerDetails.credentialLabel}`,
        `Create a new ${providerDetails.credentialLabel} with your API key`,
        `Update the ${providerDetails.nodeLabel} to use the new credential`,
      ],
      errorCode: "DECRYPTION_ERROR",
    };
  }

  // Network Errors
  if (errorString.includes("network") || errorString.includes("fetch") || errorString.includes("timeout")) {
    return {
      message: "Network Connection Error",
      guidance: `Unable to connect to ${providerDetails.name}'s servers. Please check your internet connection.`,
      fixSteps: [
        "Check your internet connection",
        `Verify ${providerDetails.name}'s API status page`,
        "Wait a moment and try again",
        "If the problem persists, contact support",
      ],
      errorCode: "NETWORK_ERROR",
    };
  }

  // Anthropic API Errors (similar patterns)
  if (errorString.includes("anthropic") && (errorString.includes("api_key") || errorString.includes("authentication"))) {
    return {
      message: "Invalid Anthropic API Key",
      guidance: "Your Anthropic API key is invalid or incorrect.",
      fixSteps: [
        "Go to your Anthropic account settings",
        "Navigate to API Keys section",
        "Create a new API key or copy an existing one",
        "Update your credential in the Credentials page",
        "Make sure the API key starts with 'sk-ant-'",
      ],
      errorCode: "ANTHROPIC_INVALID_API_KEY",
    };
  }

  // Gemini API Errors
  if (errorString.includes("gemini") && (errorString.includes("api_key") || errorString.includes("authentication"))) {
    return {
      message: "Invalid Gemini API Key",
      guidance: "Your Google Gemini API key is invalid or incorrect.",
      fixSteps: [
        "Go to Google AI Studio",
        "Navigate to API Keys section",
        "Create a new API key or copy an existing one",
        "Update your credential in the Credentials page",
      ],
      errorCode: "GEMINI_INVALID_API_KEY",
    };
  }

  // Telegram API Errors - check for any Telegram-related errors first
  if (errorString.includes("telegram") || errorString.includes("Telegram")) {
    // Check for "Bad Request" first since it's a common error
    if (errorString.includes("bad request") || (errorString.includes("400") && errorString.includes("telegram"))) {
      // Try to extract more specific error details
      let specificGuidance = "The request to Telegram API was invalid. This could be due to invalid parameters or message format.";
      
      // Try multiple patterns to extract the actual Telegram API error description
      const errorMatch = errorString.match(/description[^:]*:\s*([^,}]+)/i) 
        || errorString.match(/Telegram API error[^:]*:\s*([^\.]+)/i)
        || errorString.match(/:\s*([^\.]+)/);
      
      if (errorMatch && errorMatch[1]) {
        const telegramError = errorMatch[1].trim();
        if (telegramError.includes("chat not found") || telegramError.includes("chat_id")) {
          specificGuidance = "The chat ID is invalid or the bot doesn't have access to it. IMPORTANT: You must send at least one message to your bot first (e.g., /start or 'hello') before the bot can send messages to you.";
        } else if (telegramError.includes("message is too long")) {
          specificGuidance = "The message exceeds Telegram's 4096 character limit.";
        } else if (telegramError.includes("parse")) {
          specificGuidance = "The message format doesn't match the selected parse mode (HTML/Markdown). Try setting parse mode to 'None'.";
        } else if (!telegramError.includes("HTTP") && !telegramError.includes("Bad Request")) {
          // Only use the error if it's not just repeating the HTTP status
          specificGuidance = `Telegram API error: ${telegramError}`;
        }
      }
      
      return {
        message: "Telegram API Bad Request",
        guidance: specificGuidance,
        fixSteps: [
          "For private chats: Make sure you've started a conversation with the bot first (send /start or any message)",
          "Verify the chat ID is correct (numeric ID like 123456789 or @channelusername)",
          "Check that the message content is valid",
          "Try setting parse mode to 'None' to test if it's a formatting issue",
          "Ensure the message length is under 4096 characters",
        ],
        errorCode: "TELEGRAM_BAD_REQUEST",
      };
    }
    
    // Extract specific Telegram error codes and messages
    if (errorString.includes("unauthorized") || errorString.includes("401") || errorString.includes("invalid token")) {
      return {
        message: "Invalid Telegram Bot Token",
        guidance: "Your Telegram bot token is invalid or incorrect. Please verify your bot token.",
        fixSteps: [
          "Open Telegram and search for @BotFather",
          "Send /mybots command to see your bots",
          "Select your bot and choose 'API Token'",
          "Copy the token and update it in the Telegram node settings",
          "Make sure the token starts with numbers followed by a colon (e.g., '123456789:ABCdefGHIjklMNOpqrsTUVwxyz')",
        ],
        errorCode: "TELEGRAM_INVALID_TOKEN",
      };
    }

    if (errorString.includes("chat not found") || errorString.includes("chat_id") || errorString.includes("400") && errorString.includes("chat")) {
      return {
        message: "Telegram Chat Not Found",
        guidance: "The specified chat ID or username is invalid or the bot doesn't have access to it.",
        fixSteps: [
          "For private chats: Make sure you've started a conversation with the bot first",
          "For groups: Add the bot to the group and make it an administrator if needed",
          "For channels: Add the bot as an administrator to the channel",
          "Verify the chat ID is correct (numeric ID or @channelusername)",
          "Try sending a message to the bot first, then use that chat ID",
        ],
        errorCode: "TELEGRAM_CHAT_NOT_FOUND",
      };
    }


    if (errorString.includes("forbidden") || errorString.includes("403")) {
      return {
        message: "Telegram Bot Forbidden",
        guidance: "The bot doesn't have permission to send messages to this chat.",
        fixSteps: [
          "For groups: Make sure the bot is added to the group",
          "For channels: Add the bot as an administrator",
          "Check that the bot has permission to post messages",
          "Verify the chat ID is correct",
        ],
        errorCode: "TELEGRAM_FORBIDDEN",
      };
    }

    if (errorString.includes("too many requests") || errorString.includes("429") || errorString.includes("rate limit")) {
      return {
        message: "Telegram Rate Limit Exceeded",
        guidance: "You've sent too many messages. Telegram has rate limits to prevent spam.",
        fixSteps: [
          "Wait a few minutes before trying again",
          "Reduce the frequency of workflow executions",
          "Consider using a different bot if you need higher throughput",
        ],
        errorCode: "TELEGRAM_RATE_LIMIT",
      };
    }

    // Generic Telegram API error
    return {
      message: "Telegram API Error",
      guidance: "An error occurred while sending the message to Telegram. Please check the error details below.",
      fixSteps: [
        "Verify your bot token is correct and active",
        "Check that the chat ID is valid",
        "Ensure the message content is properly formatted",
        "Review the error message for specific details",
      ],
      errorCode: "TELEGRAM_API_ERROR",
    };
  }

  // Additional Telegram error patterns (fallback if not caught above)
  if (errorString.includes("telegram") && (errorString.includes("bot token") || errorString.includes("unauthorized") || errorString.includes("401"))) {
    return {
      message: "Invalid Telegram Bot Token",
      guidance: "Your Telegram bot token is invalid or incorrect. Please verify your bot token.",
      fixSteps: [
        "Open Telegram and search for @BotFather",
        "Send /mybots command to see your bots",
        "Select your bot and choose 'API Token'",
        "Copy the token and update it in the Telegram node settings",
        "Make sure the token starts with numbers followed by a colon",
      ],
      errorCode: "TELEGRAM_INVALID_TOKEN",
    };
  }

  if (errorString.includes("telegram") && (errorString.includes("chat") || errorString.includes("chat_id") || errorString.includes("chat not found"))) {
    return {
      message: "Telegram Chat Not Found",
      guidance: "The specified chat ID or username is invalid or the bot doesn't have access to it.",
      fixSteps: [
        "For private chats: Make sure you've started a conversation with the bot first",
        "For groups: Add the bot to the group and make it an administrator if needed",
        "For channels: Add the bot as an administrator to the channel",
        "Verify the chat ID is correct (numeric ID or @channelusername)",
        "Try sending a message to the bot first, then use that chat ID",
      ],
      errorCode: "TELEGRAM_CHAT_NOT_FOUND",
    };
  }

  if (errorString.includes("telegram") && (errorString.includes("bot token") || errorString.includes("token") || errorString.includes("required"))) {
    return {
      message: "Telegram Bot Token Required",
      guidance: "The Telegram node requires a bot token to be configured.",
      fixSteps: [
        "Double-click the Telegram node to open settings",
        "Enter your bot token from @BotFather",
        "Make sure the token is correct and active",
        "Save the node configuration",
      ],
      errorCode: "TELEGRAM_TOKEN_REQUIRED",
    };
  }
  
  // Generic Telegram error catch-all (should be last)
  if (errorString.includes("telegram")) {
    // Try to extract more details from the error message
    const badRequestMatch = errorString.match(/bad request/i);
    const httpMatch = errorString.match(/HTTP (\d+)/);
    const descriptionMatch = errorString.match(/description[^:]*:\s*([^,}]+)/i) || errorString.match(/:\s*([^\.]+)/);
    
    let guidance = "An error occurred while sending the message to Telegram.";
    if (badRequestMatch) {
      guidance = "The request to Telegram API was invalid. This could be due to invalid parameters or message format.";
    } else if (httpMatch) {
      const statusCode = httpMatch[1];
      if (statusCode === "400") {
        guidance = "The request to Telegram API was invalid. Check your chat ID, message format, and parse mode.";
      } else if (statusCode === "401") {
        guidance = "Your Telegram bot token is invalid or incorrect.";
      } else if (statusCode === "403") {
        guidance = "The bot doesn't have permission to send messages to this chat.";
      } else if (statusCode === "429") {
        guidance = "You've sent too many messages. Please wait a moment and try again.";
      }
    }
    
    if (descriptionMatch && descriptionMatch[1]) {
      const telegramError = descriptionMatch[1].trim();
      if (telegramError.includes("chat not found")) {
        return {
          message: "Telegram Chat Not Found",
          guidance: "The chat ID is invalid or the bot doesn't have access to it.",
          fixSteps: [
            "For private chats: Make sure you've started a conversation with the bot first",
            "Verify the chat ID is correct (numeric ID or @channelusername)",
            "Try sending a message to the bot first, then use that chat ID",
          ],
          errorCode: "TELEGRAM_CHAT_NOT_FOUND",
        };
      } else if (telegramError.includes("message is too long")) {
        return {
          message: "Message Too Long",
          guidance: "The message exceeds Telegram's 4096 character limit.",
          fixSteps: [
            "Shorten your message to under 4096 characters",
            "Split long messages into multiple messages",
          ],
          errorCode: "TELEGRAM_MESSAGE_TOO_LONG",
        };
      } else {
        guidance = `Telegram API error: ${telegramError}`;
      }
    }
    
    return {
      message: "Telegram API Error",
      guidance: guidance,
      fixSteps: [
        "Verify your bot token is correct and active",
        "Check that the chat ID is valid",
        "Ensure the message content is properly formatted",
        "For private chats: Make sure you've started a conversation with the bot first",
        "Review the error details for more information",
      ],
      errorCode: "TELEGRAM_API_ERROR",
    };
  }

  // Zalo Bot API Errors
  if (errorString.includes("zalo") || errorString.includes("Zalo")) {
    // Extract Zalo error code if present
    const errorCodeMatch = errorString.match(/Zalo Bot API error[^(]*\((-?\d+)\)/i);
    const zaloErrorCode = errorCodeMatch ? parseInt(errorCodeMatch[1]) : null;

    // Handle error -205: Bot does not exist
    if (zaloErrorCode === -205 || errorString.includes("Bot is not exist") || errorString.includes("Bot does not exist")) {
      return {
        message: "Zalo Bot Not Found",
        guidance: "The Bot associated with your access token cannot be found. This may happen if the Bot was deleted, suspended, or the access token is for a different Bot.",
        fixSteps: [
          "Verify your access token is for the correct Zalo Bot",
          "Check that your Bot is active and not suspended in the Zalo Developer Portal",
          "Go to developers.zalo.me and verify your Bot status",
          "Generate a new access token if needed and update it in your Zalo Bot node settings",
        ],
        errorCode: "ZALO_BOT_NOT_FOUND",
      };
    }

    // Handle error -201: Check if it's recipient_id invalid vs access token invalid
    if (zaloErrorCode === -201) {
      // Check if the error message specifically mentions recipient_id or user_id
      if (errorString.includes("recipient_id is invalid") || errorString.includes("user_id is invalid") || errorString.includes("recipient_id") || errorString.includes("user_id") || errorString.includes("user id")) {
        return {
          message: "Invalid Zalo Recipient ID",
          guidance: "The recipient_id provided is invalid or doesn't exist for your Bot.",
          fixSteps: [
            "Verify the Recipient ID is correct and matches a user who has interacted with your Bot",
            "Ensure you're using the correct recipient_id format",
            "Check that the user has started a conversation with your Bot",
            "If using variables like {{previousNode.recipientId}}, verify the previous node is returning a valid Zalo recipient_id",
            "Find Recipient IDs from webhook events or your Bot dashboard",
          ],
          errorCode: "ZALO_INVALID_RECIPIENT_ID",
        };
      }
      // Otherwise treat as access token issue
      return {
        message: "Invalid Zalo Access Token",
        guidance: "Your Zalo Bot access token is invalid, expired, or incorrect.",
        fixSteps: [
          "Go to the Zalo Developer Portal (developers.zalo.me)",
          "Navigate to your Bot settings",
          "Generate a new access token using OAuth flow",
          "Update the access token in the Zalo Bot node settings",
          "Note: Access tokens expire after a period - you may need to refresh it",
        ],
        errorCode: "ZALO_INVALID_TOKEN",
      };
    }

    // Handle error -201 with access token context (legacy check)
    if (errorString.includes("invalid access token") || errorString.includes("access_token")) {
      return {
        message: "Invalid Zalo Access Token",
        guidance: "Your Zalo Bot access token is invalid, expired, or incorrect.",
        fixSteps: [
          "Go to the Zalo Developer Portal (developers.zalo.me)",
          "Navigate to your Bot settings",
          "Generate a new access token using OAuth flow",
          "Update the access token in the Zalo Bot node settings",
          "Note: Access tokens expire after a period - you may need to refresh it",
        ],
        errorCode: "ZALO_INVALID_TOKEN",
      };
    }

    // Handle specific Zalo error codes
    if (zaloErrorCode === -213 || errorString.includes("user not interact") || errorString.includes("not interacted")) {
      return {
        message: "User Has Not Interacted With Bot",
        guidance: "The recipient has not interacted with your Bot. Users must start a conversation with your Bot before you can send them messages.",
        fixSteps: [
          "Ask the user to start a conversation with your Bot on Zalo",
          "Verify the Recipient ID is correct",
          "Once the user interacts with your Bot, try again",
        ],
        errorCode: "ZALO_USER_NOT_INTERACTED",
      };
    }

    if (zaloErrorCode === -214 || errorString.includes("user not exist") || errorString.includes("recipient id")) {
      return {
        message: "Zalo Recipient Not Found",
        guidance: "The specified Recipient ID is invalid or doesn't exist.",
        fixSteps: [
          "Verify the Recipient ID is correct",
          "Recipient IDs are numeric and specific to your Bot",
          "Check that the user has interacted with your Bot",
        ],
        errorCode: "ZALO_RECIPIENT_NOT_FOUND",
      };
    }

    if (zaloErrorCode === -118 || errorString.includes("message is too long")) {
      return {
        message: "Zalo Bot Message Too Long",
        guidance: "The message exceeds Zalo Bot's 2000 character limit.",
        fixSteps: [
          "Shorten your message to under 2000 characters",
          "Split long messages into multiple messages",
        ],
        errorCode: "ZALO_MESSAGE_TOO_LONG",
      };
    }

    if (errorString.includes("rate limit") || errorString.includes("429") || errorString.includes("too many requests")) {
      return {
        message: "Zalo Bot Rate Limit Exceeded",
        guidance: "You've sent too many messages. Zalo has rate limits to prevent spam.",
        fixSteps: [
          "Wait a few minutes before trying again",
          "Reduce the frequency of workflow executions",
          "Check Zalo Bot's rate limit documentation for specifics",
        ],
        errorCode: "ZALO_RATE_LIMIT",
      };
    }

    // Generic Zalo Bot API error
    return {
      message: "Zalo Bot API Error",
      guidance: "An error occurred while sending the message via Zalo Bot. Please check the error details below.",
      fixSteps: [
        "Verify your access token is correct and not expired",
        "Check that the Recipient ID is valid",
        "Ensure the user has interacted with your Bot",
        "Review the error message for specific details",
      ],
      errorCode: "ZALO_BOT_API_ERROR",
    };
  }

          // Google Sheets API Errors
          if (errorString.includes("google sheets") || errorString.includes("spreadsheet")) {
            if (errorString.includes("permission denied") || errorString.includes("403") || errorString.includes("forbidden")) {
              return {
                message: "Google Sheets Permission Denied",
                guidance: "The service account doesn't have permission to access this spreadsheet. Make sure the service account email has been granted access to the spreadsheet.",
                fixSteps: [
                  "Open your Google Sheet",
                  "Click 'Share' in the top right",
                  "Add the service account email (from your credential) as an editor or viewer",
                  "Make sure the service account has at least 'Viewer' permission",
                  "Try executing the workflow again",
                ],
                errorCode: "GOOGLE_SHEETS_PERMISSION_DENIED",
              };
            }

            if (errorString.includes("not found") || errorString.includes("404") || errorString.includes("spreadsheet id")) {
              return {
                message: "Google Sheet Not Found",
                guidance: "The spreadsheet ID is invalid or the spreadsheet doesn't exist. Please verify the spreadsheet ID in the node configuration.",
                fixSteps: [
                  "Double-click the Google Sheets node to open settings",
                  "Verify the Spreadsheet ID is correct",
                  "The Spreadsheet ID is in the URL: https://docs.google.com/spreadsheets/d/SPREADSHEET_ID/edit",
                  "Make sure the spreadsheet exists and is accessible",
                  "Try executing the workflow again",
                ],
                errorCode: "GOOGLE_SHEETS_NOT_FOUND",
              };
            }

            if (errorString.includes("invalid") && (errorString.includes("credential") || errorString.includes("service account"))) {
              return {
                message: "Invalid Google Sheets Credential",
                guidance: "The service account credential is invalid or malformed. Please check your credential configuration.",
                fixSteps: [
                  "Go to the Credentials page",
                  "Check your Google Sheets credential",
                  "Make sure the service account JSON is valid",
                  "Create a new credential if needed",
                  "Update the Google Sheets node to use the correct credential",
                ],
                errorCode: "GOOGLE_SHEETS_INVALID_CREDENTIAL",
              };
            }

            // "Unable to parse range: SheetName!..." means the sheet (tab) doesn't exist
            if (errorString.includes("unable to parse range")) {
              // Extract sheet name from error like "Unable to parse range: TestingSheet!A1:Z1000"
              const rangeMatch = errorString.match(/unable to parse range:\s*([^!]+)!/i);
              const sheetName = rangeMatch ? rangeMatch[1] : "the specified sheet";
              
              return {
                message: "Sheet Not Found",
                guidance: `The sheet (tab) "${sheetName}" does not exist in this spreadsheet. The spreadsheet ID is correct, but the sheet name doesn't match any tab in the spreadsheet.`,
                fixSteps: [
                  "Open your Google Spreadsheet in your browser",
                  "Look at the tab names at the bottom of the spreadsheet",
                  "Double-click the Google Sheets node to open settings",
                  `Update the Sheet Name field to match an existing tab exactly (case-sensitive)`,
                  "Common issue: The default sheet is often named 'Sheet1' (with a capital S)",
                  "Try executing the workflow again",
                ],
                errorCode: "GOOGLE_SHEETS_SHEET_NOT_FOUND",
              };
            }

            if (errorString.includes("invalid range") || (errorString.includes("range") && !errorString.includes("parse"))) {
              return {
                message: "Invalid Google Sheets Range",
                guidance: "The specified range format is invalid. Please check the range format in the node configuration.",
                fixSteps: [
                  "Double-click the Google Sheets node to open settings",
                  "Verify the range format is correct (e.g., A1:B2)",
                  "For read operations, leave range empty to read the entire sheet",
                  "For update operations, specify a valid range",
                  "Try executing the workflow again",
                ],
                errorCode: "GOOGLE_SHEETS_INVALID_RANGE",
              };
            }

            if (errorString.includes("values") || errorString.includes("invalid values")) {
              return {
                message: "Invalid Google Sheets Values",
                guidance: "The values format is invalid. Values must be a JSON array of arrays, where each inner array represents a row.",
                fixSteps: [
                  "Double-click the Google Sheets node to open settings",
                  "Check the Values field format",
                  "Values should be a JSON array: [['Column1', 'Column2'], ['Value1', 'Value2']]",
                  "Use {{variables}} for dynamic values",
                  "Make sure the JSON is valid",
                ],
                errorCode: "GOOGLE_SHEETS_INVALID_VALUES",
              };
            }

            // Generic Google Sheets error
            return {
              message: "Google Sheets API Error",
              guidance: "An error occurred while accessing Google Sheets. Please check the error details below.",
              fixSteps: [
                "Verify your service account credential is correct",
                "Check that the service account has access to the spreadsheet",
                "Verify the spreadsheet ID is correct",
                "Ensure the sheet name and range are valid",
                "Review the error message for specific details",
              ],
              errorCode: "GOOGLE_SHEETS_API_ERROR",
            };
          }

          // Workflow cycle detection
          if (errorString.includes("cycle") || errorString.includes("cyclic")) {
            return {
              message: "Workflow Contains a Cycle",
              guidance: "Your workflow has a circular dependency. This means nodes are connected in a loop, which prevents the workflow from executing in a valid order.",
              fixSteps: [
                "Review your workflow connections",
                "Look for nodes that connect back to earlier nodes in the flow",
                "Remove any connections that create a loop",
                "Ensure nodes flow in one direction: Trigger → Node 1 → Node 2 → ...",
                "A node should not connect back to a node that comes before it in the execution order",
              ],
              errorCode: "WORKFLOW_CYCLE",
            };
          }

          // Generic error fallback with sanitized original details
          const sanitizedOriginalMessage = errorMessage
            .replace(/\s+/g, " ")
            .trim()
            .slice(0, 400);

          const fallbackMessage = sanitizedOriginalMessage || "Execution Error";

          return {
            message: fallbackMessage,
            guidance: sanitizedOriginalMessage
              ? `The provider returned: "${sanitizedOriginalMessage}". Review your node configuration and credentials, then try again.`
              : "An unexpected error occurred during workflow execution. Please review the error details below.",
            fixSteps: [
              "Check the error message for specific details",
              "Verify all node configurations are correct",
              "Ensure all required credentials are set up",
              "Try executing the workflow again",
              "If the problem persists, contact support with the error details",
            ],
            errorCode: "UNKNOWN_ERROR",
          };
        }

