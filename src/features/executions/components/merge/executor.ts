import type { NodeExecutor } from "@/features/executions/types";
import { NonRetriableError } from "inngest";
import { mergeChannel } from "@/inngest/channels/merge";
import { parseError } from "@/features/executions/lib/error-parser";

type MergeData = {
  variableName?: string;
  mode?: "append" | "combine" | "multiplex" | "chooseBranch";
  combineBy?: "position" | "key";
  keyField?: string;
  inputs?: string; // Comma-separated variable names to merge
};

export const mergeExecutor: NodeExecutor<MergeData> = async ({
  data,
  nodeId,
  context,
  step,
  publish,
}) => {
  console.log(`[Merge Node ${nodeId}] Starting execution`);

  await publish(
    mergeChannel().status({
      nodeId,
      status: "loading",
    })
  );

  if (!data.variableName) {
    const errorMsg = "Variable name is missing";
    const parsedError = parseError(new Error(errorMsg));
    await publish(mergeChannel().status({ nodeId, status: "error" }));
    throw new NonRetriableError(`${parsedError.message}. ${parsedError.guidance}`);
  }

  const variableName = data.variableName;
  const mode = data.mode || "append";
  // Parse comma-separated inputs into array
  const inputs = data.inputs 
    ? data.inputs.split(",").map(s => s.trim()).filter(Boolean) 
    : [];

  try {
    const result = await step.run("merge-data", async () => {
      // Get all input data from context
      const inputData: unknown[] = inputs.map(inputName => context[inputName]).filter(Boolean);
      
      let mergedResult: unknown;

      switch (mode) {
        case "append": {
          // Append all arrays/items together
          mergedResult = inputData.flat();
          break;
        }
        
        case "combine": {
          // Combine objects by key or position
          if (data.combineBy === "key" && data.keyField) {
            // Merge by key field
            const keyMap = new Map<string, Record<string, unknown>>();
            for (const item of inputData.flat()) {
              if (item && typeof item === "object") {
                const obj = item as Record<string, unknown>;
                const key = String(obj[data.keyField] || "");
                const existing = keyMap.get(key) || {};
                keyMap.set(key, { ...existing, ...obj });
              }
            }
            mergedResult = Array.from(keyMap.values());
          } else {
            // Merge by position
            const maxLength = Math.max(...inputData.map(d => Array.isArray(d) ? d.length : 1));
            mergedResult = [];
            for (let i = 0; i < maxLength; i++) {
              let merged: Record<string, unknown> = {};
              for (const input of inputData) {
                const arr = Array.isArray(input) ? input : [input];
                if (arr[i] && typeof arr[i] === "object") {
                  merged = { ...merged, ...(arr[i] as Record<string, unknown>) };
                }
              }
              (mergedResult as Record<string, unknown>[]).push(merged);
            }
          }
          break;
        }
        
        case "multiplex": {
          // Create all combinations
          const combinations: Record<string, unknown>[] = [];
          const arrays = inputData.map(d => Array.isArray(d) ? d : [d]);
          
          const generateCombinations = (index: number, current: Record<string, unknown>) => {
            if (index >= arrays.length) {
              combinations.push({ ...current });
              return;
            }
            for (const item of arrays[index]) {
              const itemObj = typeof item === "object" && item !== null ? item : { [`input${index}`]: item };
              generateCombinations(index + 1, { ...current, ...(itemObj as Record<string, unknown>) });
            }
          };
          
          generateCombinations(0, {});
          mergedResult = combinations;
          break;
        }
        
        case "chooseBranch": {
          // Take the first non-empty input
          mergedResult = inputData.find(d => d !== null && d !== undefined) || null;
          break;
        }
        
        default:
          mergedResult = inputData;
      }

      console.log(`[Merge Node ${nodeId}] Merged ${inputData.length} inputs using mode: ${mode}`);

      return {
        ...context,
        [variableName]: mergedResult,
      };
    });

    await publish(mergeChannel().status({ nodeId, status: "success" }));
    return result;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const parsedError = parseError(new Error(errorMessage));
    await publish(mergeChannel().status({ nodeId, status: "error" }));
    throw new NonRetriableError(`${parsedError.message}. ${parsedError.guidance}`);
  }
};

