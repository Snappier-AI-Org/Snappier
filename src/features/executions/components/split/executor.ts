import type { NodeExecutor } from "@/features/executions/types";
import { NonRetriableError } from "inngest";
import { splitChannel } from "@/inngest/channels/split";
import { parseError } from "@/features/executions/lib/error-parser";
import { processTemplate } from "@/features/executions/lib/handlebars-utils";

type SplitData = {
  variableName?: string;
  mode?: "splitInBatches" | "splitByField" | "splitByDelimiter";
  batchSize?: number;
  field?: string;
  delimiter?: string;
  inputVariable?: string;
};

export const splitExecutor: NodeExecutor<SplitData> = async ({
  data,
  nodeId,
  context,
  step,
  publish,
}) => {
  console.log(`[Split Node ${nodeId}] Starting execution`);

  await publish(
    splitChannel().status({
      nodeId,
      status: "loading",
    })
  );

  if (!data.variableName) {
    const errorMsg = "Variable name is missing";
    const parsedError = parseError(new Error(errorMsg));
    await publish(splitChannel().status({ nodeId, status: "error" }));
    throw new NonRetriableError(`${parsedError.message}. ${parsedError.guidance}`);
  }

  const variableName = data.variableName;
  const mode = data.mode || "splitInBatches";

  try {
    const result = await step.run("split-data", async () => {
      // Get input data
      const inputVar = data.inputVariable ? processTemplate(data.inputVariable, context) : null;
      const inputData = inputVar ? context[inputVar] : Object.values(context)[0];
      
      let splitResult: unknown[][] = [];

      switch (mode) {
        case "splitInBatches": {
          const batchSize = data.batchSize || 10;
          const items = Array.isArray(inputData) ? inputData : [inputData];
          
          for (let i = 0; i < items.length; i += batchSize) {
            splitResult.push(items.slice(i, i + batchSize));
          }
          break;
        }
        
        case "splitByField": {
          const field = data.field || "type";
          const items = Array.isArray(inputData) ? inputData : [inputData];
          const groups = new Map<string, unknown[]>();
          
          for (const item of items) {
            if (item && typeof item === "object") {
              const key = String((item as Record<string, unknown>)[field] || "undefined");
              if (!groups.has(key)) {
                groups.set(key, []);
              }
              groups.get(key)?.push(item);
            }
          }
          
          splitResult = Array.from(groups.values());
          break;
        }
        
        case "splitByDelimiter": {
          const delimiter = data.delimiter || ",";
          if (typeof inputData === "string") {
            splitResult = inputData.split(delimiter).map(s => [s.trim()]);
          } else {
            splitResult = [[inputData]];
          }
          break;
        }
        
        default:
          splitResult = [[inputData]];
      }

      console.log(`[Split Node ${nodeId}] Split into ${splitResult.length} batches using mode: ${mode}`);

      return {
        ...context,
        [variableName]: splitResult,
        __splitBatches: splitResult,
        __splitBatchCount: splitResult.length,
      };
    });

    await publish(splitChannel().status({ nodeId, status: "success" }));
    return result;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const parsedError = parseError(new Error(errorMessage));
    await publish(splitChannel().status({ nodeId, status: "error" }));
    throw new NonRetriableError(`${parsedError.message}. ${parsedError.guidance}`);
  }
};

