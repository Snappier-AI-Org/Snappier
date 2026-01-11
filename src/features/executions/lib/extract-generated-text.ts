type MinimalLLMResult = {
  text?: string | null;
  content?: unknown;
  response?: {
    messages?: Array<
      | {
          content?: unknown;
        }
      | null
      | undefined
    >;
  } | null;
  // Inngest step.ai.wrap format
  steps?: Array<{
    content?: Array<{
      text?: string;
      type?: string;
    }>;
  }>;
};

/**
 * Extracts text content from AI SDK generateText results, regardless of provider.
 */
export function extractGeneratedText(
  result: MinimalLLMResult | null | undefined,
): string | null {
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/409f2c88-a960-40ed-8c60-3380a93586bf',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'extract-generated-text.ts:18',message:'extractGeneratedText called',data:{hasResult:!!result,resultType:typeof result,resultKeys:result&&typeof result==='object'?Object.keys(result):[],resultText:result?.text?.slice?.(0,200),hasContent:!!(result as Record<string,unknown>)?.content,hasResponse:!!(result as Record<string,unknown>)?.response,fullResultPreview:JSON.stringify(result).slice(0,1000)},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'F'})}).catch(()=>{});
  // #endregion
  
  if (!result) {
    return null;
  }

  const direct = normalizeText(result.text);
  
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/409f2c88-a960-40ed-8c60-3380a93586bf',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'extract-generated-text.ts:30',message:'After normalizeText direct',data:{directResult:direct?.slice?.(0,200),originalText:result.text?.slice?.(0,200),textType:typeof result.text},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'F'})}).catch(()=>{});
  // #endregion
  
  if (direct) {
    return direct;
  }

  const fromContent = collectTextFromParts(result.content);
  if (fromContent) {
    return fromContent;
  }

  const messages = result.response?.messages ?? [];
  for (const message of messages) {
    const fromMessage = collectTextFromParts(message?.content);
    if (fromMessage) {
      return fromMessage;
    }
  }

  // Handle Inngest step.ai.wrap format: { steps: [{ content: [{ text: "..." }] }] }
  const steps = result.steps ?? [];
  for (const step of steps) {
    const stepContent = step?.content;
    if (Array.isArray(stepContent)) {
      for (const part of stepContent) {
        if (part?.type === "text" && typeof part.text === "string") {
          const normalized = normalizeText(part.text);
          if (normalized) {
            return normalized;
          }
        }
      }
    }
  }

  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/409f2c88-a960-40ed-8c60-3380a93586bf',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'extract-generated-text.ts:55',message:'extractGeneratedText returning null',data:{triedDirect:!!result.text,triedContent:!!result.content,triedMessages:messages.length,triedSteps:steps.length},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'F'})}).catch(()=>{});
  // #endregion

  return null;
}

function collectTextFromParts(parts?: unknown): string | null {
  if (!Array.isArray(parts) || parts.length === 0) {
    return null;
  }

  const segments: string[] = [];

  for (const part of parts) {
    if (typeof part === "string") {
      const normalized = normalizeText(part);
      if (normalized) {
        segments.push(normalized);
      }
      continue;
    }

    if (!part || typeof part !== "object") {
      continue;
    }

    const maybeText = (part as { text?: unknown }).text;
    const maybeType = (part as { type?: unknown }).type;

    if (
      typeof maybeText === "string" &&
      (maybeType === undefined || maybeType === null || maybeType === "text")
    ) {
      const normalized = normalizeText(maybeText);
      if (normalized) {
        segments.push(normalized);
        continue;
      }
    }

    if ("content" in part) {
      const nested = collectTextFromParts(
        (part as { content?: unknown[] }).content,
      );
      if (nested) {
        segments.push(nested);
      }
    }
  }

  if (segments.length === 0) {
    return null;
  }

  return segments.join("\n").trim();
}

function normalizeText(value?: string | null): string | null {
  if (!value) {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}
