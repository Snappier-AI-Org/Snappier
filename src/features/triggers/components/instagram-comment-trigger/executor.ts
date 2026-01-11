import type { NodeExecutor } from "@/features/executions/types";
import { instagramCommentTriggerChannel } from "@/inngest/channels/instagram-comment-trigger";

type InstagramCommentTriggerData = {
  credentialId?: string;
  postId?: string;
  keywords?: string[];
  keywordMatchMode?: "any" | "all" | "exact";
};

export const instagramCommentTriggerExecutor: NodeExecutor<InstagramCommentTriggerData> = async ({
  nodeId,
  context,
  step,
  publish,
}) => {
  await publish(
    instagramCommentTriggerChannel().status({
      nodeId,
      status: "loading",
    })
  );

  // The trigger executor just passes through the context
  // The actual comment data is already in context.instagramComment from the webhook
  const result = await step.run("instagram-comment-trigger", async () => context);

  await publish(
    instagramCommentTriggerChannel().status({
      nodeId,
      status: "success",
    })
  );

  return result;
};

