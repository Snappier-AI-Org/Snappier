import type { NodeExecutor } from "@/features/executions/types";
import { NonRetriableError } from "inngest";
import { codeChannel } from "@/inngest/channels/code";
import { parseError } from "@/features/executions/lib/error-parser";

type CodeData = {
  variableName?: string;
  code?: string;
  language?: "javascript";
};

export const codeExecutor: NodeExecutor<CodeData> = async ({
  data,
  nodeId,
  context,
  step,
  publish,
}) => {
  console.log(`[Code Node ${nodeId}] Starting execution`);

  await publish(
    codeChannel().status({
      nodeId,
      status: "loading",
    })
  );

  if (!data.variableName) {
    const errorMsg = "Variable name is missing";
    const parsedError = parseError(new Error(errorMsg));
    await publish(codeChannel().status({ nodeId, status: "error" }));
    throw new NonRetriableError(`${parsedError.message}. ${parsedError.guidance}`);
  }

  if (!data.code) {
    const errorMsg = "Code is missing";
    const parsedError = parseError(new Error(errorMsg));
    await publish(codeChannel().status({ nodeId, status: "error" }));
    throw new NonRetriableError(`${parsedError.message}. ${parsedError.guidance}`);
  }

  const variableName = data.variableName;

  try {
    const result = await step.run("code-execute", async () => {
      // Create a sandboxed function with access to context
      const AsyncFunction = Object.getPrototypeOf(async () => {}).constructor;
      
      // Provide useful utilities to the code
      const utilities = {
        // Data access
        $input: context,
        $json: (key: string) => context[key],
        
        // Helpers
        $now: () => new Date(),
        $uuid: () => crypto.randomUUID(),
        
        // Logging (captured)
        console: {
          log: (...args: unknown[]) => console.log(`[Code Node ${nodeId}]`, ...args),
          warn: (...args: unknown[]) => console.warn(`[Code Node ${nodeId}]`, ...args),
          error: (...args: unknown[]) => console.error(`[Code Node ${nodeId}]`, ...args),
        },
        
        // JSON helpers
        JSON,
        
        // Math
        Math,
        
        // Date
        Date,
      };

      // Wrap the user code in an async function
      const wrappedCode = `
        const { $input, $json, $now, $uuid, console, JSON, Math, Date } = utilities;
        
        // User code
        ${data.code}
      `;

      try {
        const fn = new AsyncFunction("utilities", wrappedCode);
        const codeResult = await fn(utilities);
        
        console.log(`[Code Node ${nodeId}] Execution completed`, { resultType: typeof codeResult });

        return {
          ...context,
          [variableName]: codeResult ?? null,
        };
      } catch (codeError) {
        console.error(`[Code Node ${nodeId}] Code execution error:`, codeError);
        throw new Error(`Code execution failed: ${codeError instanceof Error ? codeError.message : String(codeError)}`);
      }
    });

    await publish(codeChannel().status({ nodeId, status: "success" }));
    return result;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const parsedError = parseError(new Error(errorMessage));
    await publish(codeChannel().status({ nodeId, status: "error" }));
    throw new NonRetriableError(`${parsedError.message}. ${parsedError.guidance}`);
  }
};

