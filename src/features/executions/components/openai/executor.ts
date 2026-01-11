import { createOpenAI } from "@ai-sdk/openai";
import { generateText } from "ai";
import { NonRetriableError } from "inngest";
import { parseError } from "@/features/executions/lib/error-parser";
import { extractGeneratedText } from "@/features/executions/lib/extract-generated-text";
import type { NodeExecutor } from "@/features/executions/types";
import { openAiChannel } from "@/inngest/channels/openai";
import prisma from "@/lib/db";
import { decrypt } from "@/lib/encryption";
import { processTemplate, debugTemplateContext } from "@/features/executions/lib/handlebars-utils";

type OpenAiData = {
  variableName?: string;
  credentialId?: string;
  model?: string;
  systemPrompt?: string;
  userPrompt?: string;
};

const parseOpenAiError = (error: unknown) =>
  parseError(error, { provider: "openai" });

export const openAiExecutor: NodeExecutor<OpenAiData> = async ({
  data,
  nodeId,
  context,
  userId,
  step,
  publish,
}) => {
  await publish(
    openAiChannel().status({
      nodeId,
      status: "loading",
    }),
  );

  if (!data.variableName) {
    const parsedError = parseOpenAiError(new Error("Variable name is missing"));
    await publish(
      openAiChannel().status({
        nodeId,
        status: "error",
      }),
    );
    throw new NonRetriableError(
      `${parsedError.message}. ${parsedError.guidance}`,
    );
  }

  if (!data.credentialId) {
    const parsedError = parseOpenAiError(new Error("Credential is required"));
    await publish(
      openAiChannel().status({
        nodeId,
        status: "error",
      }),
    );
    throw new NonRetriableError(
      `${parsedError.message}. ${parsedError.guidance}`,
    );
  }

  if (!data.userPrompt) {
    const parsedError = parseOpenAiError(new Error("User prompt is missing"));
    await publish(
      openAiChannel().status({
        nodeId,
        status: "error",
      }),
    );
    throw new NonRetriableError(
      `${parsedError.message}. ${parsedError.guidance}`,
    );
  }

  // Debug log to help trace variable interpolation issues
  if (data.userPrompt) {
    debugTemplateContext("OpenAI Node", data.userPrompt, context);
  }

  const systemPrompt = data.systemPrompt
    ? processTemplate(data.systemPrompt, context)
    : "You are a helpful assistant.";
  const userPrompt = processTemplate(data.userPrompt, context);

  const credential = await step.run("get-credential", () => {
    return prisma.credential.findUnique({
      where: {
        id: data.credentialId,
        userId,
      },
    });
  });

  if (!credential) {
    const parsedError = parseOpenAiError(new Error("Credential not found"));
    await publish(
      openAiChannel().status({
        nodeId,
        status: "error",
      }),
    );
    throw new NonRetriableError(
      `${parsedError.message}. ${parsedError.guidance}`,
    );
  }

  let apiKey: string;
  try {
    apiKey = decrypt(credential.value);
  } catch (decryptError) {
    const parsedError = parseOpenAiError(decryptError);
    await publish(
      openAiChannel().status({
        nodeId,
        status: "error",
      }),
    );
    throw new NonRetriableError(
      `${parsedError.message}. ${parsedError.guidance}`,
    );
  }

  const openai = createOpenAI({
    apiKey,
  });

  const selectedModel = data.model || "gpt-5-mini";

  try {
    // Validate model identifier before making the API call
    if (!selectedModel || typeof selectedModel !== "string") {
      throw new Error("Invalid model identifier: model must be a non-empty string");
    }

    const result = await step.ai.wrap("openai-generate-text", generateText, {
      model: openai(selectedModel),
      system: systemPrompt,
      prompt: userPrompt,
      experimental_telemetry: {
        isEnabled: true,
        recordInputs: true,
        recordOutputs: true,
      },
    });
    
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/409f2c88-a960-40ed-8c60-3380a93586bf',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'openai/executor.ts:140',message:'OpenAI step.ai.wrap result',data:{resultType:typeof result,resultKeys:result&&typeof result==='object'?Object.keys(result):[],hasText:'text' in (result||{}),textValue:(result as Record<string,unknown>)?.text?.toString?.()?.slice?.(0,300),fullResultPreview:JSON.stringify(result).slice(0,1500)},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'F'})}).catch(()=>{});
    // #endregion
    
    const text = extractGeneratedText(result) ?? "";

    await publish(
      openAiChannel().status({
        nodeId,
        status: "success",
      }),
    );

    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/409f2c88-a960-40ed-8c60-3380a93586bf',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'openai/executor.ts:148',message:'OpenAI returning context',data:{variableName:data.variableName,textLength:text?.length,textPreview:text?.slice(0,200),existingContextKeys:Object.keys(context)},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'E'})}).catch(()=>{});
    // #endregion

    return {
      ...context,
      [data.variableName]: {
        text,
      },
    };
  } catch (error) {
    const parsedError = parseOpenAiError(error);
    
    // Log model identifier errors specifically
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorString = errorMessage.toLowerCase();
    
    if (
      errorString.includes("model") && 
      (errorString.includes("not found") || 
       errorString.includes("does not exist") || 
       errorString.includes("invalid model") ||
       errorString.includes("model_not_found") ||
       errorString.includes("model_id_invalid"))
    ) {
      console.error(`[OpenAI Executor] Model identifier error for model "${selectedModel}":`, errorMessage);
    }
    
    await publish(
      openAiChannel().status({
        nodeId,
        status: "error",
      }),
    );

    // Create a more helpful error message
    const fullErrorMessage = `${parsedError.message}. ${parsedError.guidance}`;
    
    // If it's a model identifier error, include the model name in the error
    if (parsedError.errorCode === "MODEL_NOT_FOUND") {
      throw new NonRetriableError(
        `${fullErrorMessage} (Attempted to use model: "${selectedModel}")`
      );
    }
    
    throw new NonRetriableError(fullErrorMessage);
  }
};
