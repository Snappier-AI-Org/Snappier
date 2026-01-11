import { createOpenAI } from "@ai-sdk/openai";
import { generateText } from "ai";
import { NonRetriableError } from "inngest";
import { HfInference } from "@huggingface/inference";
import { parseError } from "@/features/executions/lib/error-parser";
import { extractGeneratedText } from "@/features/executions/lib/extract-generated-text";
import type { NodeExecutor } from "@/features/executions/types";
import { huggingfaceChannel } from "@/inngest/channels/huggingface";
import prisma from "@/lib/db";
import { decrypt } from "@/lib/encryption";
import { processTemplate, debugTemplateContext } from "@/features/executions/lib/handlebars-utils";

type HuggingFaceData = {
  variableName?: string;
  credentialId?: string;
  model?: string;
  systemPrompt?: string;
  userPrompt?: string;
};

const parseHuggingFaceError = (error: unknown) =>
  parseError(error, { provider: "huggingface" });

export const huggingfaceExecutor: NodeExecutor<HuggingFaceData> = async ({
  data,
  nodeId,
  context,
  userId,
  step,
  publish,
}) => {
  await publish(
    huggingfaceChannel().status({
      nodeId,
      status: "loading",
    }),
  );

  if (!data.variableName) {
    const parsedError = parseHuggingFaceError(new Error("Variable name is missing"));
    await publish(
      huggingfaceChannel().status({
        nodeId,
        status: "error",
      }),
    );
    throw new NonRetriableError(
      `${parsedError.message}. ${parsedError.guidance}`,
    );
  }

  if (!data.credentialId) {
    const parsedError = parseHuggingFaceError(new Error("Credential is required"));
    await publish(
      huggingfaceChannel().status({
        nodeId,
        status: "error",
      }),
    );
    throw new NonRetriableError(
      `${parsedError.message}. ${parsedError.guidance}`,
    );
  }

  if (!data.userPrompt) {
    const parsedError = parseHuggingFaceError(new Error("User prompt is missing"));
    await publish(
      huggingfaceChannel().status({
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
    debugTemplateContext("Hugging Face Node", data.userPrompt, context);
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
    const parsedError = parseHuggingFaceError(new Error("Credential not found"));
    await publish(
      huggingfaceChannel().status({
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
    const parsedError = parseHuggingFaceError(decryptError);
    await publish(
      huggingfaceChannel().status({
        nodeId,
        status: "error",
      }),
    );
    throw new NonRetriableError(
      `${parsedError.message}. ${parsedError.guidance}`,
    );
  }

  // Hugging Face Inference API using the official SDK
  const hf = new HfInference(apiKey);

  const selectedModel = data.model || "mistralai/Mistral-7B-Instruct-v0.3";

  try {
    // Validate model identifier before making the API call
    if (!selectedModel || typeof selectedModel !== "string") {
      throw new Error("Invalid model identifier: model must be a non-empty string");
    }

    // Use Hugging Face's text generation API
    const messages = systemPrompt 
      ? [
          { role: "system" as const, content: systemPrompt },
          { role: "user" as const, content: userPrompt }
        ]
      : [
          { role: "user" as const, content: userPrompt }
        ];

    const result = await step.run("huggingface-generate-text", async () => {
      const response = await hf.chatCompletion({
        model: selectedModel,
        messages,
        max_tokens: 2000,
        temperature: 0.7,
      });

      return response.choices[0]?.message?.content || "";
    });
    
    const text = result || "";

    await publish(
      huggingfaceChannel().status({
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
    const parsedError = parseHuggingFaceError(error);
    
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
      console.error(`[Hugging Face Executor] Model identifier error for model "${selectedModel}":`, errorMessage);
    }
    
    await publish(
      huggingfaceChannel().status({
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
