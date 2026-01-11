import type { NodeExecutor } from "@/features/executions/types";
import { NonRetriableError } from "inngest";
import { instagramCommentReplyChannel } from "@/inngest/channels/instagram-comment-reply";
import { parseError } from "@/features/executions/lib/error-parser";
import {
  processTemplate,
  debugTemplateContext,
} from "@/features/executions/lib/handlebars-utils";
import { replyToComment, type InstagramCredentials } from "@/features/meta/services/instagram-api";
import prisma from "@/lib/db";
import { decrypt } from "@/lib/encryption";

type InstagramCommentReplyData = {
  variableName?: string;
  credentialId?: string;
  commentId?: string;
  replyText?: string;
};

type MetaInstagramCredentialValue = {
  accessToken: string;
  pageId: string;
  instagramAccountId: string;
};

export const instagramCommentReplyExecutor: NodeExecutor<InstagramCommentReplyData> = async ({
  data,
  nodeId,
  userId,
  context,
  step,
  publish,
}) => {
  console.log(`[Instagram Comment Reply Node ${nodeId}] Starting execution`, {
    nodeId,
    hasCredentialId: !!data.credentialId,
    hasCommentId: !!data.commentId,
    hasReplyText: !!data.replyText,
  });

  await publish(
    instagramCommentReplyChannel().status({
      nodeId,
      status: "loading",
    })
  );

  if (!data.variableName) {
    const errorMsg = "Variable name is missing";
    console.error(`[Instagram Comment Reply Node ${nodeId}] Error: ${errorMsg}`);
    const parsedError = parseError(new Error(errorMsg));
    await publish(
      instagramCommentReplyChannel().status({
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
    console.error(`[Instagram Comment Reply Node ${nodeId}] Error: ${errorMsg}`);
    const parsedError = parseError(new Error(errorMsg));
    await publish(
      instagramCommentReplyChannel().status({
        nodeId,
        status: "error",
      })
    );
    throw new NonRetriableError(
      `${parsedError.message}. ${parsedError.guidance}`
    );
  }

  if (!data.commentId) {
    const errorMsg = "Comment ID is required";
    console.error(`[Instagram Comment Reply Node ${nodeId}] Error: ${errorMsg}`);
    const parsedError = parseError(new Error(errorMsg));
    await publish(
      instagramCommentReplyChannel().status({
        nodeId,
        status: "error",
      })
    );
    throw new NonRetriableError(
      `${parsedError.message}. ${parsedError.guidance}`
    );
  }

  if (!data.replyText) {
    const errorMsg = "Reply text is missing";
    console.error(`[Instagram Comment Reply Node ${nodeId}] Error: ${errorMsg}`);
    const parsedError = parseError(new Error(errorMsg));
    await publish(
      instagramCommentReplyChannel().status({
        nodeId,
        status: "error",
      })
    );
    throw new NonRetriableError(
      `${parsedError.message}. ${parsedError.guidance}`
    );
  }

  // Debug log to help trace variable interpolation issues
  debugTemplateContext("Instagram Comment Reply Node", data.replyText, context);

  const replyText = processTemplate(data.replyText, context);
  const commentId = processTemplate(data.commentId, context);

  console.log(`[Instagram Comment Reply Node ${nodeId}] Sending reply to Instagram API`, {
    commentId,
    replyLength: replyText.length,
  });

  try {
    const result = await step.run("instagram-comment-reply-send", async () => {
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

      // Send the reply
      const response = await replyToComment(credentials, commentId, replyText);

      console.log(`[Instagram Comment Reply Node ${nodeId}] Reply posted successfully`, {
        replyId: response.id,
        commentId,
      });

      return {
        ...context,
        [variableName]: {
          replyId: response.id,
          commentId,
          replyText: replyText.slice(0, 300),
          status: "posted",
          timestamp: new Date().toISOString(),
        },
      };
    });

    await publish(
      instagramCommentReplyChannel().status({
        nodeId,
        status: "success",
      })
    );

    console.log(
      `[Instagram Comment Reply Node ${nodeId}] Execution completed successfully`,
      {
        resultKeys: result ? Object.keys(result) : [],
        variableName: data.variableName,
      }
    );

    return result;
  } catch (error) {
    let errorMessage = "Unknown error occurred";
    if (error instanceof Error) {
      errorMessage = error.message;
      console.error(`[Instagram Comment Reply Node ${nodeId}] Execution failed:`, {
        message: error.message,
        stack: error.stack,
      });
    } else if (typeof error === "string") {
      errorMessage = error;
    } else {
      errorMessage = String(error);
    }

    const parsedError = parseError(new Error(errorMessage));
    console.error(`[Instagram Comment Reply Node ${nodeId}] Parsed error:`, {
      message: parsedError.message,
      guidance: parsedError.guidance,
      errorCode: parsedError.errorCode,
    });

    await publish(
      instagramCommentReplyChannel().status({
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

