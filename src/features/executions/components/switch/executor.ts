import type { NodeExecutor } from "@/features/executions/types";
import { NonRetriableError } from "inngest";
import { switchChannel } from "@/inngest/channels/switch";
import { parseError } from "@/features/executions/lib/error-parser";
import { processTemplate } from "@/features/executions/lib/handlebars-utils";

type SwitchRule = {
  name: string;
  condition: string;
  output: number;
};

type SwitchData = {
  variableName?: string;
  mode?: "rules" | "expression";
  rules?: SwitchRule[];
  expression?: string;
  fallbackOutput?: number;
};

export const switchExecutor: NodeExecutor<SwitchData> = async ({
  data,
  nodeId,
  context,
  step,
  publish,
}) => {
  console.log(`[Switch Node ${nodeId}] Starting execution`);

  await publish(
    switchChannel().status({
      nodeId,
      status: "loading",
    })
  );

  if (!data.variableName) {
    const errorMsg = "Variable name is missing";
    const parsedError = parseError(new Error(errorMsg));
    await publish(switchChannel().status({ nodeId, status: "error" }));
    throw new NonRetriableError(`${parsedError.message}. ${parsedError.guidance}`);
  }

  const variableName = data.variableName;
  const mode = data.mode || "rules";

  try {
    const result = await step.run("switch-evaluate", async () => {
      let matchedBranch = "fallback";
      let matchedOutput = data.fallbackOutput || 0;

      if (mode === "rules" && data.rules && data.rules.length > 0) {
        // Evaluate each rule in order
        for (const rule of data.rules) {
          try {
            // Process the condition with template variables
            const processedCondition = processTemplate(rule.condition, context);
            
            // Safely evaluate the condition
            // biome-ignore lint/security/noGlobalEval: Required for dynamic condition evaluation
            const conditionResult = eval(processedCondition);
            
            if (conditionResult) {
              matchedBranch = rule.name;
              matchedOutput = rule.output;
              console.log(`[Switch Node ${nodeId}] Matched rule: ${rule.name}`);
              break;
            }
          } catch (evalError) {
            console.warn(`[Switch Node ${nodeId}] Rule evaluation error:`, evalError);
          }
        }
      } else if (mode === "expression" && data.expression) {
        // Evaluate expression mode
        const processedExpression = processTemplate(data.expression, context);
        try {
          // biome-ignore lint/security/noGlobalEval: Required for dynamic expression evaluation
          matchedOutput = eval(processedExpression);
          matchedBranch = `output_${matchedOutput}`;
        } catch (evalError) {
          console.warn(`[Switch Node ${nodeId}] Expression evaluation error:`, evalError);
          matchedOutput = data.fallbackOutput || 0;
        }
      }

      console.log(`[Switch Node ${nodeId}] Routing to branch: ${matchedBranch}, output: ${matchedOutput}`);

      return {
        ...context,
        [variableName]: {
          matchedBranch,
          matchedOutput,
          mode,
        },
        __switchOutput: matchedOutput,
        __switchBranch: matchedBranch,
      };
    });

    await publish(
      switchChannel().status({
        nodeId,
        status: "success",
        branch: result.__switchBranch as string,
      })
    );

    return result;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const parsedError = parseError(new Error(errorMessage));
    await publish(switchChannel().status({ nodeId, status: "error" }));
    throw new NonRetriableError(`${parsedError.message}. ${parsedError.guidance}`);
  }
};

