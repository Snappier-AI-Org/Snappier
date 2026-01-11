import { NonRetriableError } from "inngest";
import type { NodeExecutor } from "@/features/executions/types";
import { loopChannel } from "@/inngest/channels/loop";
import { processTemplate } from "@/features/executions/lib/handlebars-utils";

// =============================================================================
// Types
// =============================================================================

type LoopMode = "forEach" | "times" | "while";

type LoopData = {
  variableName?: string;
  mode?: LoopMode;
  // For forEach mode
  sourceArray?: string;
  // For times mode
  iterations?: number;
  // For while mode (future use)
  condition?: string;
  // Common options
  maxIterations?: number;
  collectResults?: boolean;
};

// =============================================================================
// Helper Functions
// =============================================================================

function resolveArrayFromContext(
  sourceArray: string,
  context: Record<string, unknown>,
): unknown[] {
  // Support Handlebars-style field references like {{variableName.property}}
  let fieldPath = sourceArray.trim();

  // Remove handlebars syntax if present
  if (fieldPath.startsWith("{{") && fieldPath.endsWith("}}")) {
    fieldPath = fieldPath.slice(2, -2).trim();
  }

  // Try to parse as JSON array first
  if (fieldPath.startsWith("[") && fieldPath.endsWith("]")) {
    try {
      const parsed = JSON.parse(fieldPath);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    } catch {
      // Not valid JSON, continue with context resolution
    }
  }

  // Split by dots to navigate nested objects
  const parts = fieldPath.split(".");
  let current: unknown = context;

  for (const part of parts) {
    if (!part) continue;

    if (
      current === null ||
      current === undefined ||
      typeof current !== "object" ||
      !(part in (current as Record<string, unknown>))
    ) {
      return [];
    }

    current = (current as Record<string, unknown>)[part];
  }

  // If result is an array, return it
  if (Array.isArray(current)) {
    return current;
  }

  // If result is a string that looks like JSON array, try to parse it
  if (typeof current === "string") {
    try {
      const parsed = JSON.parse(current);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    } catch {
      // Not valid JSON
    }

    // If it's a comma-separated string, split it
    if (current.includes(",")) {
      return current.split(",").map((s) => s.trim());
    }
  }

  // If we have a single value that's not undefined/null, wrap it in array
  if (current !== undefined && current !== null) {
    return [current];
  }

  return [];
}

// =============================================================================
// Executor
// =============================================================================

export const loopExecutor: NodeExecutor<LoopData> = async ({
  data,
  nodeId,
  context,
  step,
  publish,
}) => {
  const {
    variableName = "loop",
    mode = "forEach",
    sourceArray = "",
    iterations = 1,
    maxIterations = 1000,
    collectResults = true,
  } = data;

  await publish(
    loopChannel().status({
      nodeId,
      status: "loading",
      currentIndex: 0,
      totalItems: 0,
    }),
  );

  if (!variableName) {
    await publish(
      loopChannel().status({
        nodeId,
        status: "error",
      }),
    );
    throw new NonRetriableError("Variable name is required for Loop node");
  }

  try {
    const result = await step.run(`loop-execute-${nodeId}`, async () => {
      let items: unknown[] = [];
      let totalIterations = 0;

      switch (mode) {
        case "forEach": {
          if (!sourceArray) {
            throw new NonRetriableError(
              "Source array is required for forEach mode",
            );
          }

          // Resolve the source array from context
          const resolvedArray = resolveArrayFromContext(sourceArray, context);
          items = resolvedArray;
          totalIterations = Math.min(items.length, maxIterations);
          break;
        }

        case "times": {
          const count = Math.min(
            Math.max(0, Math.floor(iterations)),
            maxIterations,
          );
          totalIterations = count;
          items = Array.from({ length: count }, (_, i) => i);
          break;
        }

        case "while": {
          // For now, while mode is not fully implemented
          // It would require evaluating conditions on each iteration
          throw new NonRetriableError(
            "While loop mode is not yet implemented",
          );
        }

        default:
          throw new NonRetriableError(`Unknown loop mode: ${mode}`);
      }

      // Build the loop output data
      const loopData: {
        items: unknown[];
        totalItems: number;
        mode: LoopMode;
        completed: boolean;
      } = {
        items,
        totalItems: totalIterations,
        mode,
        completed: true,
      };

      return loopData;
    });

    await publish(
      loopChannel().status({
        nodeId,
        status: "success",
        currentIndex: result.totalItems,
        totalItems: result.totalItems,
      }),
    );

    // Return updated context with loop result
    // The __loopData flag is used for the workflow executor to handle iteration
    const items = result.items as unknown[];
    const firstItem = items.length > 0 ? items[0] : null;
    
    return {
      ...context,
      [variableName]: {
        items: items,
        totalItems: result.totalItems,
        currentIndex: 0,
        currentItem: firstItem,
        isFirst: true,
        isLast: result.totalItems <= 1,
        mode: result.mode,
      },
      __loopData: {
        nodeId,
        variableName,
        items: items,
        totalItems: result.totalItems,
        collectResults,
      },
    };
  } catch (error) {
    await publish(
      loopChannel().status({
        nodeId,
        status: "error",
      }),
    );
    throw error;
  }
};
