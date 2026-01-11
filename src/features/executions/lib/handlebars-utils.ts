import Handlebars from "handlebars";
import { decode } from "html-entities";

// Register the json helper that properly handles undefined values
Handlebars.registerHelper("json", (context) => {
  // Handle undefined, null, or missing values gracefully
  if (context === undefined || context === null) {
    return new Handlebars.SafeString("");
  }

  try {
    const stringified = JSON.stringify(context, null, 2);
    return new Handlebars.SafeString(stringified);
  } catch (error) {
    console.warn("[Handlebars] Failed to stringify context:", error);
    return new Handlebars.SafeString("");
  }
});

// Register a default helper to catch undefined variables and provide better debugging
Handlebars.registerHelper("helperMissing", function (/* dynamic arguments */) {
  // This helper is called when a helper is not found
  // We return empty string instead of throwing
  return "";
});

/**
 * Normalizes templates to support bracket notation for keys with spaces or special characters.
 * 
 * Examples:
 *   {{googleForm.responses["What's your name?"]}} → {{lookup googleForm.responses "What's your name?"}}
 *   {{googleForm.responses['What is your email?']}} → {{lookup googleForm.responses "What is your email?"}}
 */
function normalizeTemplate(template: string): string {
  // Handle double-quoted bracket notation: obj["key with 'apostrophes' or spaces"]
  const doubleQuoteRegex = /{{\s*([\w.]+)\s*\[\s*"([^"]+)"\s*\]\s*}}/g;
  let result = template.replace(doubleQuoteRegex, (_match, basePath, key) => `{{lookup ${basePath} "${key}"}}`);

  // Handle single-quoted bracket notation: obj['simple key']
  const singleQuoteRegex = /{{\s*([\w.]+)\s*\[\s*'([^']*)'\s*\]\s*}}/g;
  result = result.replace(singleQuoteRegex, (_match, basePath, key) => `{{lookup ${basePath} "${key}"}}`);

  return result;
}

/**
 * Compiles and executes a Handlebars template with the given context.
 * This function handles:
 * - Normalizing bracket notation for keys with spaces
 * - Decoding HTML entities
 * - Error handling with fallback to original template
 * 
 * @param template The Handlebars template string (or undefined)
 * @param context The context object containing variables
 * @returns The interpolated and decoded string (empty string if template is undefined/empty)
 */
export function processTemplate(
  template: string | undefined,
  context: Record<string, unknown>
): string {
  if (!template) return "";

  // First, normalize any bracket-notation paths
  const normalized = normalizeTemplate(template);

  try {
    const compiledTemplate = Handlebars.compile(normalized, {
      // Strict mode will throw for missing properties - we don't want that
      strict: false,
    });
    const result = compiledTemplate(context);
    
    // #region agent log
    const hasUnresolvedVars = result.includes('{{') || (template.includes('{{') && result === template);
    if (hasUnresolvedVars || template.includes('{{')) {
      fetch('http://127.0.0.1:7242/ingest/409f2c88-a960-40ed-8c60-3380a93586bf',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'handlebars-utils.ts:71',message:'Handlebars template processing',data:{template:template.slice(0,200),normalized:normalized.slice(0,200),result:result.slice(0,200),contextKeys:Object.keys(context),hasUnresolvedVars,templateHasVars:template.includes('{{')},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'B,C,D'})}).catch(()=>{});
    }
    // #endregion
    
    // Decode HTML entities
    return decode(result);
  } catch (error) {
    console.error("[Handlebars] Template processing error:", error, { template: normalized });
    // Return the original template on error so the user can see what went wrong
    return template;
  }
}

/**
 * Debug function to log the context and template for troubleshooting variable issues.
 */
export function debugTemplateContext(
  label: string,
  template: string,
  context: Record<string, unknown>
): void {
  console.log(`[${label}] Template interpolation debug:`, {
    template: template.substring(0, 200),
    contextKeys: Object.keys(context),
    contextSnapshot: Object.fromEntries(
      Object.entries(context)
        .slice(0, 5)
        .map(([key, value]) => [
          key,
          value !== null && typeof value === "object"
            ? `{${Object.keys(value as object).join(", ")}}`
            : typeof value,
        ])
    ),
  });
}

// Export the configured Handlebars instance for cases where direct access is needed
export { Handlebars };

