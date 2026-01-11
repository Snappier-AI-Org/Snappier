import { NonRetriableError } from "inngest";
import type { NodeExecutor } from "@/features/executions/types";
import { filterConditionalChannel } from "@/inngest/channels/filter-conditional";
import { processTemplate } from "@/features/executions/lib/handlebars-utils";

// =============================================================================
// Types
// =============================================================================

type Operator =
  | "equals"
  | "not_equals"
  | "contains"
  | "not_contains"
  | "starts_with"
  | "ends_with"
  | "greater_than"
  | "less_than"
  | "greater_than_or_equals"
  | "less_than_or_equals"
  | "is_empty"
  | "is_not_empty"
  | "is_true"
  | "is_false"
  | "regex_match";

type LogicalOperator = "AND" | "OR";

type Condition = {
  field: string;
  operator: Operator;
  value?: string;
};

type FilterConditionalData = {
  variableName?: string;
  conditions?: Condition[];
  logicalOperator?: LogicalOperator;
  trueOutputName?: string;
  falseOutputName?: string;
};

// =============================================================================
// Condition Evaluation Helpers
// =============================================================================

type LiteralParseResult =
  | { matched: true; value: unknown }
  | { matched: false };

function parseLiteralValue(fieldPath: string): LiteralParseResult {
  const trimmed = fieldPath.trim();

  if (trimmed === "") {
    return { matched: true, value: "" };
  }

  if (/^-?\d+(\.\d+)?$/.test(trimmed)) {
    return { matched: true, value: Number(trimmed) };
  }

  if (/^(true|false)$/i.test(trimmed)) {
    return { matched: true, value: trimmed.toLowerCase() === "true" };
  }

  if (trimmed === "null") {
    return { matched: true, value: null };
  }

  if (trimmed === "undefined") {
    return { matched: true, value: undefined };
  }

  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return { matched: true, value: trimmed.slice(1, -1) };
  }

  return { matched: false };
}

function resolveFieldValue(
  field: string,
  context: Record<string, unknown>,
): unknown {
  // Support Handlebars-style field references like {{variableName.property}}
  let fieldPath = field.trim();

  // Remove handlebars syntax if present
  if (fieldPath.startsWith("{{") && fieldPath.endsWith("}}")) {
    fieldPath = fieldPath.slice(2, -2).trim();
  }

  // Split by dots to navigate nested objects
  const parts = fieldPath.split(".");
  let current: unknown = context;
  let resolvedFromContext = true;

  for (const part of parts) {
    if (!part) {
      continue;
    }

    if (
      current === null ||
      current === undefined ||
      typeof current !== "object" ||
      !(part in (current as Record<string, unknown>))
    ) {
      resolvedFromContext = false;
      current = undefined;
      break;
    }

    current = (current as Record<string, unknown>)[part];
  }

  if (!resolvedFromContext || current === undefined) {
    const literal = parseLiteralValue(fieldPath);
    if (literal.matched) {
      return literal.value;
    }
  }

  return current;
}

function resolveValue(
  value: string | undefined,
  context: Record<string, unknown>,
): string {
  if (!value) return "";

  // Use the centralized processTemplate function to resolve variables
  return processTemplate(value, context);
}

function evaluateCondition(
  condition: Condition,
  context: Record<string, unknown>,
): boolean {
  const fieldValue = resolveFieldValue(condition.field, context);
  const compareValue = resolveValue(condition.value, context);

  const fieldStr =
    fieldValue !== undefined && fieldValue !== null ? String(fieldValue) : "";
  const fieldNum = Number(fieldValue);
  const compareNum = Number(compareValue);

  switch (condition.operator) {
    case "equals":
      // Try numeric comparison first, fall back to string
      if (!Number.isNaN(fieldNum) && !Number.isNaN(compareNum)) {
        return fieldNum === compareNum;
      }
      return fieldStr === compareValue;

    case "not_equals":
      if (!Number.isNaN(fieldNum) && !Number.isNaN(compareNum)) {
        return fieldNum !== compareNum;
      }
      return fieldStr !== compareValue;

    case "contains":
      return fieldStr.toLowerCase().includes(compareValue.toLowerCase());

    case "not_contains":
      return !fieldStr.toLowerCase().includes(compareValue.toLowerCase());

    case "starts_with":
      return fieldStr.toLowerCase().startsWith(compareValue.toLowerCase());

    case "ends_with":
      return fieldStr.toLowerCase().endsWith(compareValue.toLowerCase());

    case "greater_than":
      if (Number.isNaN(fieldNum) || Number.isNaN(compareNum)) {
        throw new NonRetriableError(
          `Cannot compare non-numeric values: ${fieldStr} > ${compareValue}`,
        );
      }
      return fieldNum > compareNum;

    case "less_than":
      if (Number.isNaN(fieldNum) || Number.isNaN(compareNum)) {
        throw new NonRetriableError(
          `Cannot compare non-numeric values: ${fieldStr} < ${compareValue}`,
        );
      }
      return fieldNum < compareNum;

    case "greater_than_or_equals":
      if (Number.isNaN(fieldNum) || Number.isNaN(compareNum)) {
        throw new NonRetriableError(
          `Cannot compare non-numeric values: ${fieldStr} >= ${compareValue}`,
        );
      }
      return fieldNum >= compareNum;

    case "less_than_or_equals":
      if (Number.isNaN(fieldNum) || Number.isNaN(compareNum)) {
        throw new NonRetriableError(
          `Cannot compare non-numeric values: ${fieldStr} <= ${compareValue}`,
        );
      }
      return fieldNum <= compareNum;

    case "is_empty":
      return (
        fieldValue === undefined ||
        fieldValue === null ||
        fieldStr === "" ||
        (Array.isArray(fieldValue) && fieldValue.length === 0)
      );

    case "is_not_empty":
      return (
        fieldValue !== undefined &&
        fieldValue !== null &&
        fieldStr !== "" &&
        !(Array.isArray(fieldValue) && fieldValue.length === 0)
      );

    case "is_true":
      return (
        fieldValue === true ||
        fieldStr.toLowerCase() === "true" ||
        fieldStr === "1"
      );

    case "is_false":
      return (
        fieldValue === false ||
        fieldStr.toLowerCase() === "false" ||
        fieldStr === "0" ||
        fieldValue === null ||
        fieldValue === undefined
      );

    case "regex_match":
      try {
        const regex = new RegExp(compareValue, "i");
        return regex.test(fieldStr);
      } catch (_error) {
        throw new NonRetriableError(`Invalid regex pattern: ${compareValue}`);
      }

    default:
      throw new NonRetriableError(`Unknown operator: ${condition.operator}`);
  }
}

function evaluateConditions(
  conditions: Condition[],
  logicalOperator: LogicalOperator,
  context: Record<string, unknown>,
): boolean {
  if (conditions.length === 0) {
    return true; // No conditions = pass through
  }

  const results = conditions.map((condition) =>
    evaluateCondition(condition, context),
  );

  if (logicalOperator === "AND") {
    return results.every((result) => result);
  } else {
    return results.some((result) => result);
  }
}

// =============================================================================
// Executor
// =============================================================================

export const filterConditionalExecutor: NodeExecutor<
  FilterConditionalData
> = async ({ data, nodeId, context, step, publish }) => {
  const {
    conditions = [],
    logicalOperator = "AND",
    variableName = "filterResult",
  } = data;

  await publish(
    filterConditionalChannel().status({
      nodeId,
      status: "loading",
    }),
  );

  try {
    const result = await step.run(`evaluate-conditions-${nodeId}`, async () => {
      // Evaluate all conditions
      const passed = evaluateConditions(conditions, logicalOperator, context);

      return {
        passed,
        conditionResults: conditions.map((condition) => ({
          field: condition.field,
          operator: condition.operator,
          value: condition.value,
          fieldValue: resolveFieldValue(condition.field, context),
          result: evaluateCondition(condition, context),
        })),
        logicalOperator,
      };
    });

    await publish(
      filterConditionalChannel().status({
        nodeId,
        status: "success",
      }),
    );

    // Return updated context with filter result
    // The branching logic will be handled by the workflow executor
    // based on the output handle (true/false branch)
    return {
      ...context,
      [variableName]: {
        passed: result.passed,
        branch: result.passed ? "true" : "false",
        conditionResults: result.conditionResults,
        logicalOperator: result.logicalOperator,
      },
      // Also set a special flag for branching
      __filterResult: {
        nodeId,
        passed: result.passed,
      },
    };
  } catch (error) {
    await publish(
      filterConditionalChannel().status({
        nodeId,
        status: "error",
      }),
    );
    throw error;
  }
};
