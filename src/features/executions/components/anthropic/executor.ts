import { createAnthropic } from "@ai-sdk/anthropic";
import { generateText } from "ai";
import { NonRetriableError } from "inngest";
import { parseError } from "@/features/executions/lib/error-parser";
import { extractGeneratedText } from "@/features/executions/lib/extract-generated-text";
import type { NodeExecutor } from "@/features/executions/types";
import { anthropicChannel } from "@/inngest/channels/anthropic";
import prisma from "@/lib/db";
import { decrypt } from "@/lib/encryption";
import { processTemplate, debugTemplateContext } from "@/features/executions/lib/handlebars-utils";

type AnthropicData = {
  variableName?: string;
  credentialId?: string;
  model?: string;
  systemPrompt?: string;
  userPrompt?: string;
};

const parseAnthropicError = (error: unknown) =>
  parseError(error, { provider: "anthropic" });

export const anthropicExecutor: NodeExecutor<AnthropicData> = async ({
  data,
  nodeId,
  context,
  userId,
  step,
  publish,
}) => {
  await publish(
    anthropicChannel().status({
      nodeId,
      status: "loading",
    }),
  );

  if (!data.variableName) {
    const parsedError = parseAnthropicError(
      new Error("Variable name is missing"),
    );
    await publish(
      anthropicChannel().status({
        nodeId,
        status: "error",
      }),
    );
    throw new NonRetriableError(
      `${parsedError.message}. ${parsedError.guidance}`,
    );
  }

  if (!data.credentialId) {
    const parsedError = parseAnthropicError(
      new Error("Credential is required"),
    );
    await publish(
      anthropicChannel().status({
        nodeId,
        status: "error",
      }),
    );
    throw new NonRetriableError(
      `${parsedError.message}. ${parsedError.guidance}`,
    );
  }

  if (!data.userPrompt) {
    const parsedError = parseAnthropicError(
      new Error("User prompt is missing"),
    );
    await publish(
      anthropicChannel().status({
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
    debugTemplateContext("Anthropic Node", data.userPrompt, context);
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
    const parsedError = parseAnthropicError(new Error("Credential not found"));
    await publish(
      anthropicChannel().status({
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
    const parsedError = parseAnthropicError(decryptError);
    await publish(
      anthropicChannel().status({
        nodeId,
        status: "error",
      }),
    );
    throw new NonRetriableError(
      `${parsedError.message}. ${parsedError.guidance}`,
    );
  }

  const anthropic = createAnthropic({
    apiKey,
  });

  const selectedModel = data.model || "claude-3-5-haiku-20241022";

  try {
    const result = await step.ai.wrap("anthropic-generate-text", generateText, {
      model: anthropic(selectedModel),
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
      anthropicChannel().status({
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
    const parsedError = parseAnthropicError(error);
    await publish(
      anthropicChannel().status({
        nodeId,
        status: "error",
      }),
    );

    const errorMessage = `${parsedError.message}. ${parsedError.guidance}`;
    throw new NonRetriableError(errorMessage);
  }
};
