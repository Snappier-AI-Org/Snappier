import type { NodeExecutor } from "@/features/executions/types";
import { NonRetriableError } from "inngest";
import ky from "ky";
import { slackChannel } from "@/inngest/channels/slack";
import { processTemplate, debugTemplateContext } from "@/features/executions/lib/handlebars-utils";

type SlackData = {
  variableName?: string;
  webhookUrl?: string;
  content?: string;
};

export const slackExecutor: NodeExecutor<SlackData> = async ({
  data,
  nodeId,
  context,
  userId,
  step,
  publish,
}) => {
  await publish(
    slackChannel().status({
    nodeId,
    status: "loading",
  }));

if (!data.content) {
  await publish(
    slackChannel().status({
      nodeId,
      status: "error",
    })
  );

  throw new NonRetriableError("Slack Node: User prompt is missing");
}

// Debug log to help trace variable interpolation issues
debugTemplateContext("Slack Node", data.content, context);

const content = processTemplate(data.content, context);

  try {
    const result = await step.run("slack-webhook", async () => {


      if (!data.webhookUrl) {
  await publish(
    slackChannel().status({
      nodeId,
      status: "error",
    }),
  );
  throw new NonRetriableError("Slack node: Webhook URL is required");
}

      await ky.post(data.webhookUrl!, {
        json: {
          content: content, // the key depends on workflow config
        },
      });

  if (!data.variableName) {
  await publish(
    slackChannel().status({
      nodeId,
      status: "error",
    })
  );
    throw new NonRetriableError("Slack node: Variable name is missing.");
}


      return {
        ...context,
        [data.variableName]: {
          messageContent: content.slice(0, 2000),
        },
      };
    });

    await publish(
      slackChannel().status({
        nodeId,
        status: "success",
      }),
    );
    return result;
  } catch (error) {
    await publish(
      slackChannel().status({
        nodeId,
        status: "error",
      }),
    );
    throw error;
  }
}


