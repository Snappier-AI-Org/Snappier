import type { NodeExecutor } from "@/features/executions/types";
import { instagramTriggerChannel } from "@/inngest/channels/instagram-trigger";

type InstagramTriggerData = {
  credentialId?: string;
  triggerType?: "dm" | "comment" | "both";
  // DM-specific options
  dmKeywords?: string[];
  dmKeywordMatchMode?: "any" | "all" | "exact";
  // Comment-specific options
  postId?: string;
  commentKeywords?: string[];
  commentKeywordMatchMode?: "any" | "all" | "exact";
};

export const instagramTriggerExecutor: NodeExecutor<InstagramTriggerData> = async ({
  nodeId,
  context,
  step,
  publish,
}) => {
  await publish(
    instagramTriggerChannel().status({
      nodeId,
      status: "loading",
    })
  );

  // The trigger executor just passes through the context
  // The actual DM/comment data is already in context from the webhook
  const result = await step.run("instagram-trigger", async () => context);

  await publish(
    instagramTriggerChannel().status({
      nodeId,
      status: "success",
    })
  );

  return result;
};
