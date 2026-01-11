import type { NodeExecutor } from "@/features/executions/types";
import { gmailTriggerChannel } from "@/inngest/channels/gmail-trigger";

type GmailTriggerData = {
  credentialId?: string;
  labelIds?: string[];
};

export const gmailTriggerExecutor: NodeExecutor<GmailTriggerData> = async ({
  nodeId,
  context,
  step,
  publish,
}) => {
  await publish(
    gmailTriggerChannel().status({
      nodeId,
      status: "loading",
    })
  );

  // The trigger executor just passes through the context
  // The actual email data is already in context.gmailTrigger from the webhook
  const result = await step.run("gmail-trigger", async () => context);

  await publish(
    gmailTriggerChannel().status({
      nodeId,
      status: "success",
    })
  );

  return result;
};
