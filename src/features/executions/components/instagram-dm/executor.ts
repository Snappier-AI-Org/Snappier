import type { NodeExecutor } from "@/features/executions/types";
import { NonRetriableError } from "inngest";
import { instagramDmChannel } from "@/inngest/channels/instagram-dm";
import { parseError } from "@/features/executions/lib/error-parser";
import {
  processTemplate,
  debugTemplateContext,
} from "@/features/executions/lib/handlebars-utils";
import { sendDirectMessage, type InstagramCredentials } from "@/features/meta/services/instagram-api";
import prisma from "@/lib/db";
import { decrypt } from "@/lib/encryption";

type InstagramDmData = {
  variableName?: string;
  credentialId?: string;
  recipientId?: string;
  messageContent?: string;
};

type MetaInstagramCredentialValue = {
  accessToken: string;
  pageId: string;
  instagramAccountId: string;
};

export const instagramDmExecutor: NodeExecutor<InstagramDmData> = async ({
  data,
  nodeId,
  userId,
  context,
  step,
  publish,
}) => {
  console.log(`[Instagram DM Node ${nodeId}] Starting execution`, {
    nodeId,
    hasCredentialId: !!data.credentialId,
    hasRecipientId: !!data.recipientId,
    hasMessageContent: !!data.messageContent,
  });

  await publish(
    instagramDmChannel().status({
      nodeId,
      status: "loading",
    })
  );

  if (!data.variableName) {
    const errorMsg = "Variable name is missing";
    console.error(`[Instagram DM Node ${nodeId}] Error: ${errorMsg}`);
    const parsedError = parseError(new Error(errorMsg));
    await publish(
      instagramDmChannel().status({
        nodeId,
        status: "error",
      })
    );
    throw new NonRetriableError(
      `${parsedError.message}. ${parsedError.guidance}`
    );
  }

  const variableName = data.variableName;

  if (!data.credentialId) {
    const errorMsg = "Instagram credential is required";
    console.error(`[Instagram DM Node ${nodeId}] Error: ${errorMsg}`);
    const parsedError = parseError(new Error(errorMsg));
    await publish(
      instagramDmChannel().status({
        nodeId,
        status: "error",
      })
    );
    throw new NonRetriableError(
      `${parsedError.message}. ${parsedError.guidance}`
    );
  }

  if (!data.recipientId) {
    const errorMsg = "Recipient ID is required";
    console.error(`[Instagram DM Node ${nodeId}] Error: ${errorMsg}`);
    const parsedError = parseError(new Error(errorMsg));
    await publish(
      instagramDmChannel().status({
        nodeId,
        status: "error",
      })
    );
    throw new NonRetriableError(
      `${parsedError.message}. ${parsedError.guidance}`
    );
  }

  if (!data.messageContent) {
    const errorMsg = "Message content is missing";
    console.error(`[Instagram DM Node ${nodeId}] Error: ${errorMsg}`);
    const parsedError = parseError(new Error(errorMsg));
    await publish(
      instagramDmChannel().status({
        nodeId,
        status: "error",
      })
    );
    throw new NonRetriableError(
      `${parsedError.message}. ${parsedError.guidance}`
    );
  }

  // Debug log to help trace variable interpolation issues
  debugTemplateContext("Instagram DM Node", data.messageContent, context);

  const messageContent = processTemplate(data.messageContent, context);
  const recipientId = processTemplate(data.recipientId, context);

  console.log(`[Instagram DM Node ${nodeId}] Sending DM to Instagram API`, {
    recipientId,
    messageLength: messageContent.length,
  });

  try {
    const result = await step.run("instagram-dm-send", async () => {
      // Fetch the credential
      const credential = await prisma.credential.findFirst({
        where: { id: data.credentialId, userId },
      });

      if (!credential) {
        throw new Error("Instagram credential not found");
      }

      const decryptedValue = decrypt(credential.value);
      let credentialData: MetaInstagramCredentialValue;

      try {
        credentialData = JSON.parse(decryptedValue);
      } catch {
        throw new Error("Invalid Instagram credential format");
      }

      const credentials: InstagramCredentials = {
        accessToken: credentialData.accessToken,
        pageId: credentialData.pageId,
        instagramAccountId: credentialData.instagramAccountId,
      };

      // Send the DM
      const response = await sendDirectMessage(
        credentials,
        recipientId,
        messageContent
      );

      console.log(`[Instagram DM Node ${nodeId}] DM sent successfully`, {
        messageId: response.messageId,
        recipientId: response.recipientId,
      });

      return {
        ...context,
        [variableName]: {
          messageId: response.messageId,
          recipientId: response.recipientId,
          messageContent: messageContent.slice(0, 1000),
          status: "sent",
          timestamp: new Date().toISOString(),
        },
      };
    });

    await publish(
      instagramDmChannel().status({
        nodeId,
        status: "success",
      })
    );

    console.log(`[Instagram DM Node ${nodeId}] Execution completed successfully`, {
      resultKeys: result ? Object.keys(result) : [],
      variableName: data.variableName,
    });

    return result;
  } catch (error) {
    let errorMessage = "Unknown error occurred";
    if (error instanceof Error) {
      errorMessage = error.message;
      console.error(`[Instagram DM Node ${nodeId}] Execution failed:`, {
        message: error.message,
        stack: error.stack,
      });
    } else if (typeof error === "string") {
      errorMessage = error;
    } else {
      errorMessage = String(error);
    }

    const parsedError = parseError(new Error(errorMessage));
    console.error(`[Instagram DM Node ${nodeId}] Parsed error:`, {
      message: parsedError.message,
      guidance: parsedError.guidance,
      errorCode: parsedError.errorCode,
    });

    await publish(
      instagramDmChannel().status({
        nodeId,
        status: "error",
      })
    );

    let fullErrorMessage = `${parsedError.message}. ${parsedError.guidance}`;

    if (errorMessage && !errorMessage.includes(parsedError.message)) {
      fullErrorMessage += ` Details: ${errorMessage}`;
    }

    throw new NonRetriableError(fullErrorMessage);
  }
};

