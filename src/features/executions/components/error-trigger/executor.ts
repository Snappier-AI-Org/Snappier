import type { NodeExecutor } from "@/features/executions/types";
import { NonRetriableError } from "inngest";
import { errorTriggerChannel } from "@/inngest/channels/error-trigger";
import { parseError } from "@/features/executions/lib/error-parser";

type ErrorTriggerData = {
  variableName?: string;
  continueOnError?: boolean;
};

export const errorTriggerExecutor: NodeExecutor<ErrorTriggerData> = async ({
  data,
  nodeId,
  context,
  step,
  publish,
}) => {
  console.log(`[Error Trigger Node ${nodeId}] Starting execution`);

  await publish(
    errorTriggerChannel().status({
      nodeId,
      status: "loading",
    })
  );

  const variableName = data.variableName || "error";

  try {
    const result = await step.run("error-trigger-process", async () => {
      // Check if there's an error in the context from previous nodes
      const hasError = context.__error || context.__lastError;
      
      if (hasError) {
        console.log(`[Error Trigger Node ${nodeId}] Captured error:`, hasError);
        const errorMessage = typeof hasError === "object" && hasError !== null && "message" in hasError 
          ? (hasError as { message: string }).message 
          : String(hasError);
        
        return {
          ...context,
          [variableName]: {
            hasError: true,
            error: hasError,
            message: errorMessage,
            timestamp: new Date().toISOString(),
          },
          __errorHandled: true,
        };
      }

      // No error - pass through normally
      return {
        ...context,
        [variableName]: {
          hasError: false,
          error: null,
          message: null,
          timestamp: new Date().toISOString(),
        },
      };
    });

    await publish(errorTriggerChannel().status({ nodeId, status: "success" }));
    return result;
  } catch (error) {
    // If continueOnError is true, we capture the error instead of throwing
    if (data.continueOnError) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.log(`[Error Trigger Node ${nodeId}] Continuing despite error:`, errorMessage);
      
      await publish(errorTriggerChannel().status({ nodeId, status: "success" }));
      
      return {
        ...context,
        [variableName]: {
          hasError: true,
          error: errorMessage,
          message: errorMessage,
          timestamp: new Date().toISOString(),
        },
        __errorHandled: true,
      };
    }

    const errorMessage = error instanceof Error ? error.message : String(error);
    const parsedError = parseError(new Error(errorMessage));
    await publish(errorTriggerChannel().status({ nodeId, status: "error" }));
    throw new NonRetriableError(`${parsedError.message}. ${parsedError.guidance}`);
  }
};

