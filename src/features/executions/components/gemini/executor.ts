import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { generateText } from "ai";
import { NonRetriableError } from "inngest";
import { parseError } from "@/features/executions/lib/error-parser";
import { extractGeneratedText } from "@/features/executions/lib/extract-generated-text";
import type { NodeExecutor } from "@/features/executions/types";
import { geminiChannel } from "@/inngest/channels/gemini";
import prisma from "@/lib/db";
import { decrypt } from "@/lib/encryption";
import { processTemplate, debugTemplateContext } from "@/features/executions/lib/handlebars-utils";

type GeminiData = {
  variableName?: string;
  credentialId?: string;
  model?: string;
  systemPrompt?: string;
  userPrompt?: string;
};

const parseGeminiError = (error: unknown) =>
  parseError(error, { provider: "gemini" });

export const geminiExecutor: NodeExecutor<GeminiData> = async ({
  data,
  nodeId,
  context,
  userId,
  step,
  publish,
}) => {
  await publish(
    geminiChannel().status({
      nodeId,
      status: "loading",
    }),
  );

  if (!data.variableName) {
    const parsedError = parseGeminiError(new Error("Variable name is missing"));
    await publish(
      geminiChannel().status({
        nodeId,
        status: "error",
      }),
    );
    throw new NonRetriableError(
      `${parsedError.message}. ${parsedError.guidance}`,
    );
  }

  if (!data.credentialId) {
    const parsedError = parseGeminiError(new Error("Credential is required"));
    await publish(
      geminiChannel().status({
        nodeId,
        status: "error",
      }),
    );
    throw new NonRetriableError(
      `${parsedError.message}. ${parsedError.guidance}`,
    );
  }

  if (!data.userPrompt) {
    const parsedError = parseGeminiError(new Error("User prompt is missing"));
    await publish(
      geminiChannel().status({
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
    debugTemplateContext("Gemini Node", data.userPrompt, context);
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
    const parsedError = parseGeminiError(new Error("Credential not found"));
    await publish(
      geminiChannel().status({
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
    const parsedError = parseGeminiError(decryptError);
    await publish(
      geminiChannel().status({
        nodeId,
        status: "error",
      }),
    );
    throw new NonRetriableError(
      `${parsedError.message}. ${parsedError.guidance}`,
    );
  }

  const google = createGoogleGenerativeAI({
    apiKey,
  });

  const selectedModel = data.model || "gemini-2.0-flash";

  try {
    const result = await step.ai.wrap("gemini-generate-text", generateText, {
      model: google(selectedModel),
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
      geminiChannel().status({
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
    const parsedError = parseGeminiError(error);
    await publish(
      geminiChannel().status({
        nodeId,
        status: "error",
      }),
    );

    const errorMessage = `${parsedError.message}. ${parsedError.guidance}`;
    throw new NonRetriableError(errorMessage);
  }
};
