import type { NodeExecutor } from "@/features/executions/types";
import { NonRetriableError } from "inngest";
import { discordChannel } from "@/inngest/channels/discord";
import ky from "ky";
import { processTemplate, debugTemplateContext } from "@/features/executions/lib/handlebars-utils";

type DiscordData = {
  variableName?: string;
  webhookUrl?: string;
  content?: string;
  username?: string;
};

export const discordExecutor: NodeExecutor<DiscordData> = async ({
  data,
  nodeId,
  context,
  userId,
  step,
  publish,
}) => {
  await publish(
    discordChannel().status({
    nodeId,
    status: "loading",
  }));

if (!data.content) {
  await publish(
    discordChannel().status({
      nodeId,
      status: "error",
    })
  );

  throw new NonRetriableError("Discord node: Message content is missing");
}

// Debug log to help trace variable interpolation issues
debugTemplateContext("Discord Node", data.content, context);

// #region agent log
fetch('http://127.0.0.1:7242/ingest/409f2c88-a960-40ed-8c60-3380a93586bf',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'discord/executor.ts:40',message:'Discord pre-processTemplate',data:{rawContent:data.content,contextKeys:Object.keys(context),contextSnapshot:JSON.stringify(context).slice(0,1000)},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'B,C,D'})}).catch(()=>{});
// #endregion

const content = processTemplate(data.content, context);

// #region agent log
fetch('http://127.0.0.1:7242/ingest/409f2c88-a960-40ed-8c60-3380a93586bf',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'discord/executor.ts:45',message:'Discord post-processTemplate',data:{rawContent:data.content,processedContent:content.slice(0,500),hasVariables:data.content?.includes('{{')},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'B,C,D'})}).catch(()=>{});
const username = data.username;

  try {
    const result = await step.run("discord-webhook", async () => {


      if (!data.webhookUrl) {
  await publish(
    discordChannel().status({
      nodeId,
      status: "error",
    }),
  );
  throw new NonRetriableError("Discord node: Webhook URL is required");
}

      await ky.post(data.webhookUrl!, {
        json: {
          content: content.slice(0, 2000), // Discord's max message len
          ...(username ? { username } : {}), // Only include username if it has a value
        },
      });

  if (!data.variableName) {
  await publish(
    discordChannel().status({
      nodeId,
      status: "error",
    })
  );
    throw new NonRetriableError("Discord node: Variable name is missing.");
}


      return {
        ...context,
        [data.variableName]: {
          messageContent: content.slice(0, 2000),
        },
      };
    });

    await publish(
      discordChannel().status({
        nodeId,
        status: "success",
      }),
    );
    return result;
  } catch (error) {
    await publish(
      discordChannel().status({
        nodeId,
        status: "error",
      }),
    );
    throw error;
  }
}


