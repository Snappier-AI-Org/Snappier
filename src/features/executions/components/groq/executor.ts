import { createOpenAI } from "@ai-sdk/openai";
import { generateText } from "ai";
import { NonRetriableError } from "inngest";
import { parseError } from "@/features/executions/lib/error-parser";
import { extractGeneratedText } from "@/features/executions/lib/extract-generated-text";
import type { NodeExecutor } from "@/features/executions/types";
import { groqChannel } from "@/inngest/channels/groq";
import prisma from "@/lib/db";
import { decrypt } from "@/lib/encryption";
import { processTemplate, debugTemplateContext } from "@/features/executions/lib/handlebars-utils";

type GroqData = {
  variableName?: string;
  credentialId?: string;
  model?: string;
  systemPrompt?: string;
  userPrompt?: string;
};

const parseGroqError = (error: unknown) =>
  parseError(error, { provider: "groq" });

export const groqExecutor: NodeExecutor<GroqData> = async ({
  data,
  nodeId,
  context,
  userId,
  step,
  publish,
}) => {
  await publish(
    groqChannel().status({
      nodeId,
      status: "loading",
    }),
  );

  if (!data.variableName) {
    const parsedError = parseGroqError(new Error("Variable name is missing"));
    await publish(
      groqChannel().status({
        nodeId,
        status: "error",
      }),
    );
    throw new NonRetriableError(
      `${parsedError.message}. ${parsedError.guidance}`,
    );
  }

  if (!data.credentialId) {
    const parsedError = parseGroqError(new Error("Credential is required"));
    await publish(
      groqChannel().status({
        nodeId,
        status: "error",
      }),
    );
    throw new NonRetriableError(
      `${parsedError.message}. ${parsedError.guidance}`,
    );
  }

  if (!data.userPrompt) {
    const parsedError = parseGroqError(new Error("User prompt is missing"));
    await publish(
      groqChannel().status({
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
    debugTemplateContext("Groq Node", data.userPrompt, context);
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
    const parsedError = parseGroqError(new Error("Credential not found"));
    await publish(
      groqChannel().status({
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
    const parsedError = parseGroqError(decryptError);
    await publish(
      groqChannel().status({
        nodeId,
        status: "error",
      }),
    );
    throw new NonRetriableError(
      `${parsedError.message}. ${parsedError.guidance}`,
    );
  }

  // Groq uses OpenAI-compatible API, so we use createOpenAI with custom baseURL
  const groq = createOpenAI({
    apiKey,
    baseURL: "https://api.groq.com/openai/v1",
  });

  const selectedModel = data.model || "llama-3.3-70b-versatile";

  try {
    // Validate model identifier before making the API call
    if (!selectedModel || typeof selectedModel !== "string") {
      throw new Error("Invalid model identifier: model must be a non-empty string");
    }

    const result = await step.ai.wrap("groq-generate-text", generateText, {
      model: groq(selectedModel),
      system: systemPrompt,
      prompt: userPrompt,
      experimental_telemetry: {
        isEnabled: true,
        recordInputs: true,
        recordOutputs: true,
      },
    });
    
    const text = extractGeneratedText(result) ?? "";

    await publish(
      groqChannel().status({
        nodeId,
        status: "success",
      }),
    );

    return {
      ...context,
      [data.variableName]: {
        text,
      },
    };
  } catch (error) {
    const parsedError = parseGroqError(error);
    
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
      console.error(`[Groq Executor] Model identifier error for model "${selectedModel}":`, errorMessage);
    }
    
    await publish(
      groqChannel().status({
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
