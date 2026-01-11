import type { NodeExecutor } from "@/features/executions/types";
import { instagramDmTriggerChannel } from "@/inngest/channels/instagram-dm-trigger";

type InstagramDmTriggerData = {
  credentialId?: string;
  keywords?: string[];
  keywordMatchMode?: "any" | "all" | "exact";
};

export const instagramDmTriggerExecutor: NodeExecutor<InstagramDmTriggerData> = async ({
  nodeId,
  context,
  step,
  publish,
}) => {
  await publish(
    instagramDmTriggerChannel().status({
      nodeId,
      status: "loading",
    })
  );

  // The trigger executor just passes through the context
  // The actual DM data is already in context.instagramDM from the webhook
  const result = await step.run("instagram-dm-trigger", async () => context);

  await publish(
    instagramDmTriggerChannel().status({
      nodeId,
      status: "success",
    })
  );

  return result;
};

