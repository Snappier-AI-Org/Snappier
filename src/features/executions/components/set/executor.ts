import type { NodeExecutor } from "@/features/executions/types";
import { NonRetriableError } from "inngest";
import { setChannel } from "@/inngest/channels/set";
import { parseError } from "@/features/executions/lib/error-parser";
import { processTemplate } from "@/features/executions/lib/handlebars-utils";

type SetField = {
  name: string;
  value: string;
  type?: "string" | "number" | "boolean" | "json" | "expression";
};

type SetData = {
  mode?: "manual" | "expression";
  fields?: SetField[];
  keepOnlySet?: boolean;
};

export const setExecutor: NodeExecutor<SetData> = async ({
  data,
  nodeId,
  context,
  step,
  publish,
}) => {
  console.log(`[Set Node ${nodeId}] Starting execution`);

  await publish(
    setChannel().status({
      nodeId,
      status: "loading",
    })
  );

  const mode = data.mode || "manual";
  const fields = data.fields || [];

  try {
    const result = await step.run("set-values", async () => {
      const newValues: Record<string, unknown> = {};

      for (const field of fields) {
        const processedValue = processTemplate(field.value, context);
        let finalValue: unknown = processedValue;

        // Convert to the specified type
        switch (field.type) {
          case "number":
            finalValue = Number(processedValue);
            if (Number.isNaN(finalValue)) {
              finalValue = 0;
            }
            break;
          
          case "boolean":
            finalValue = processedValue === "true" || processedValue === "1";
            break;
          
          case "json":
            try {
              finalValue = JSON.parse(processedValue);
            } catch {
              finalValue = processedValue;
            }
            break;
          
          case "expression":
            try {
              // biome-ignore lint/security/noGlobalEval: Required for expression evaluation
              finalValue = eval(processedValue);
            } catch {
              finalValue = processedValue;
            }
            break;
          
          case "string":
          default:
            finalValue = String(processedValue);
            break;
        }

        newValues[field.name] = finalValue;
        console.log(`[Set Node ${nodeId}] Set ${field.name} = ${JSON.stringify(finalValue).slice(0, 100)}`);
      }

      // If keepOnlySet is true, return only the new values
      // Otherwise, merge with existing context
      if (data.keepOnlySet) {
        return newValues;
      }

      return {
        ...context,
        ...newValues,
      };
    });

    await publish(setChannel().status({ nodeId, status: "success" }));
    return result;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const parsedError = parseError(new Error(errorMessage));
    await publish(setChannel().status({ nodeId, status: "error" }));
    throw new NonRetriableError(`${parsedError.message}. ${parsedError.guidance}`);
  }
};

