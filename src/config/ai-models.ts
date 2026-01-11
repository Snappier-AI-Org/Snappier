export type ModelPricingTier = "FREE" | "FREE_LIMITED" | "PAID" | "PAID_PREMIUM";

export interface AIModel {
  id: string;
  name: string;
  description?: string;
  pricingTier: ModelPricingTier;
  available: boolean;
}

export const OPENAI_MODELS: AIModel[] = [
  // Latest GPT-5.2 series
  {
    id: "gpt-5.2-pro",
    name: "GPT-5.2 Pro",
    description: "Most capable model, latest flagship",
    pricingTier: "PAID_PREMIUM",
    available: true,
  },
  {
    id: "gpt-5.2-thinking",
    name: "GPT-5.2 Thinking",
    description: "Complex reasoning mode",
    pricingTier: "PAID_PREMIUM",
    available: true,
  },
  {
    id: "gpt-5.2-instant",
    name: "GPT-5.2 Instant",
    description: "Fast responses, latest generation",
    pricingTier: "PAID",
    available: true,
  },
  {
    id: "gpt-5-mini",
    name: "GPT-5 Mini",
    description: "Fastest and cheapest GPT-5 variant",
    pricingTier: "PAID",
    available: true,
  },
  // GPT-5.1 series
  {
    id: "gpt-5.1",
    name: "GPT-5.1",
    description: "Multimodal with customizable personalities",
    pricingTier: "PAID",
    available: true,
  },
  {
    id: "gpt-5.1-codex-max",
    name: "GPT-5.1 Codex Max",
    description: "Advanced coding, long-context capabilities",
    pricingTier: "PAID_PREMIUM",
    available: true,
  },
  {
    id: "gpt-5.1-codex",
    name: "GPT-5.1 Codex",
    description: "Coding-focused model",
    pricingTier: "PAID",
    available: true,
  },
  {
    id: "gpt-5.1-codex-mini",
    name: "GPT-5.1 Codex Mini",
    description: "Lightweight coding model (Preview)",
    pricingTier: "PAID",
    available: true,
  },
  {
    id: "gpt-5",
    name: "GPT-5",
    description: "Base GPT-5 model",
    pricingTier: "PAID",
    available: true,
  },
  // Previous generation (kept for backward compatibility)
  {
    id: "gpt-4o",
    name: "GPT-4o",
    description: "Previous generation, optimized for speed",
    pricingTier: "PAID",
    available: true,
  },
  {
    id: "gpt-4o-mini",
    name: "GPT-4o Mini",
    description: "Previous generation, fast and cheap",
    pricingTier: "PAID",
    available: true,
  },
  {
    id: "gpt-4-turbo",
    name: "GPT-4 Turbo",
    description: "Previous generation flagship model",
    pricingTier: "PAID",
    available: true,
  },
  {
    id: "gpt-4",
    name: "GPT-4",
    description: "Original GPT-4 model",
    pricingTier: "PAID",
    available: true,
  },
  {
    id: "gpt-3.5-turbo",
    name: "GPT-3.5 Turbo",
    description: "Fast and cost-effective",
    pricingTier: "PAID",
    available: true,
  },
];

export const ANTHROPIC_MODELS: AIModel[] = [
  // Latest Claude 4.5 series
  {
    id: "claude-opus-4.5",
    name: "Claude Opus 4.5",
    description: "Most powerful, enhanced coding capabilities",
    pricingTier: "PAID_PREMIUM",
    available: true,
  },
  {
    id: "claude-sonnet-4.5",
    name: "Claude Sonnet 4.5",
    description: "Best for real-world agents and coding",
    pricingTier: "PAID",
    available: true,
  },
  {
    id: "claude-haiku-4.5",
    name: "Claude Haiku 4.5",
    description: "Fastest and most affordable",
    pricingTier: "PAID",
    available: true,
  },
  // Previous generation (kept for backward compatibility)
  {
    id: "claude-3-5-sonnet-20241022",
    name: "Claude 3.5 Sonnet",
    description: "Previous generation, balanced performance",
    pricingTier: "PAID",
    available: true,
  },
  {
    id: "claude-3-5-haiku-20241022",
    name: "Claude 3.5 Haiku",
    description: "Previous generation, fast and efficient",
    pricingTier: "PAID",
    available: true,
  },
  {
    id: "claude-3-opus-20240229",
    name: "Claude 3 Opus",
    description: "Previous generation, most powerful for complex reasoning",
    pricingTier: "PAID_PREMIUM",
    available: true,
  },
  {
    id: "claude-3-sonnet-20240229",
    name: "Claude 3 Sonnet",
    description: "Previous generation, balanced performance and speed",
    pricingTier: "PAID",
    available: true,
  },
  {
    id: "claude-3-haiku-20240307",
    name: "Claude 3 Haiku",
    description: "Previous generation, fast and efficient",
    pricingTier: "PAID",
    available: true,
  },
];

export const GEMINI_MODELS: AIModel[] = [
  // Latest Gemini 3 series
  {
    id: "gemini-3-pro",
    name: "Gemini 3 Pro",
    description: "Most advanced, multimodal understanding",
    pricingTier: "PAID",
    available: true,
  },
  {
    id: "gemini-3-deep-think",
    name: "Gemini 3 Deep Think",
    description: "Enhanced reasoning abilities",
    pricingTier: "PAID_PREMIUM",
    available: true,
  },
  {
    id: "gemini-3-flash",
    name: "Gemini 3 Flash",
    description: "Fast variant of Gemini 3",
    pricingTier: "FREE_LIMITED",
    available: true,
  },
  {
    id: "gemini-2.5-pro",
    name: "Gemini 2.5 Pro",
    description: "Previous generation, still capable",
    pricingTier: "FREE_LIMITED",
    available: true,
  },
  // Previous generation (kept for backward compatibility)
  {
    id: "gemini-2.0-flash-exp",
    name: "Gemini 2.0 Flash (Experimental)",
    description: "Previous experimental model",
    pricingTier: "FREE_LIMITED",
    available: true,
  },
  {
    id: "gemini-2.0-flash",
    name: "Gemini 2.0 Flash",
    description: "Previous generation, fast and efficient",
    pricingTier: "FREE_LIMITED",
    available: true,
  },
  {
    id: "gemini-1.5-pro",
    name: "Gemini 1.5 Pro",
    description: "Previous generation, most capable model",
    pricingTier: "FREE_LIMITED",
    available: true,
  },
  {
    id: "gemini-1.5-flash",
    name: "Gemini 1.5 Flash",
    description: "Previous generation, fast and cost-effective",
    pricingTier: "FREE_LIMITED",
    available: true,
  },
  {
    id: "gemini-pro",
    name: "Gemini Pro",
    description: "Legacy model",
    pricingTier: "FREE_LIMITED",
    available: true,
  },
];

export const GROQ_MODELS: AIModel[] = [
  // Llama 3.3 series (latest)
  {
    id: "llama-3.3-70b-versatile",
    name: "Llama 3.3 70B Versatile",
    description: "Latest Llama, great for general tasks",
    pricingTier: "FREE_LIMITED",
    available: true,
  },
  // Llama 3.1 series
  {
    id: "llama-3.1-70b-versatile",
    name: "Llama 3.1 70B Versatile",
    description: "Previous Llama, versatile capabilities",
    pricingTier: "FREE_LIMITED",
    available: true,
  },
  {
    id: "llama-3.1-8b-instant",
    name: "Llama 3.1 8B Instant",
    description: "Fastest Llama model",
    pricingTier: "FREE_LIMITED",
    available: true,
  },
  // Llama 3 series
  {
    id: "llama3-70b-8192",
    name: "Llama 3 70B",
    description: "Large Llama 3 model",
    pricingTier: "FREE_LIMITED",
    available: true,
  },
  {
    id: "llama3-8b-8192",
    name: "Llama 3 8B",
    description: "Fast Llama 3 model",
    pricingTier: "FREE_LIMITED",
    available: true,
  },
  // Mixtral series
  {
    id: "mixtral-8x7b-32768",
    name: "Mixtral 8x7B",
    description: "Mixture of experts, 32K context",
    pricingTier: "FREE_LIMITED",
    available: true,
  },
  // Gemma series
  {
    id: "gemma2-9b-it",
    name: "Gemma 2 9B",
    description: "Google's Gemma model",
    pricingTier: "FREE_LIMITED",
    available: true,
  },
  {
    id: "gemma-7b-it",
    name: "Gemma 7B",
    description: "Google's compact Gemma model",
    pricingTier: "FREE_LIMITED",
    available: true,
  },
];

export const HUGGINGFACE_MODELS: AIModel[] = [
  // Mistral models (most popular on HF)
  {
    id: "mistralai/Mistral-7B-Instruct-v0.3",
    name: "Mistral 7B Instruct v0.3",
    description: "Latest Mistral instruction model",
    pricingTier: "FREE_LIMITED",
    available: true,
  },
  {
    id: "mistralai/Mixtral-8x7B-Instruct-v0.1",
    name: "Mixtral 8x7B Instruct",
    description: "Mixture of experts, powerful reasoning",
    pricingTier: "FREE_LIMITED",
    available: true,
  },
  // Meta Llama models
  {
    id: "meta-llama/Meta-Llama-3.1-8B-Instruct",
    name: "Llama 3.1 8B Instruct",
    description: "Meta's efficient instruction model",
    pricingTier: "FREE_LIMITED",
    available: true,
  },
  {
    id: "meta-llama/Meta-Llama-3.1-70B-Instruct",
    name: "Llama 3.1 70B Instruct",
    description: "Meta's large instruction model",
    pricingTier: "FREE_LIMITED",
    available: true,
  },
  // Microsoft Phi models
  {
    id: "microsoft/Phi-3-mini-4k-instruct",
    name: "Phi-3 Mini 4K",
    description: "Compact but capable Microsoft model",
    pricingTier: "FREE_LIMITED",
    available: true,
  },
  {
    id: "microsoft/Phi-3-medium-4k-instruct",
    name: "Phi-3 Medium 4K",
    description: "Microsoft's medium-sized model",
    pricingTier: "FREE_LIMITED",
    available: true,
  },
  // Google models
  {
    id: "google/gemma-2-9b-it",
    name: "Gemma 2 9B IT",
    description: "Google's instruction-tuned Gemma",
    pricingTier: "FREE_LIMITED",
    available: true,
  },
  {
    id: "google/gemma-2-2b-it",
    name: "Gemma 2 2B IT",
    description: "Lightweight Google model",
    pricingTier: "FREE_LIMITED",
    available: true,
  },
  // Qwen models
  {
    id: "Qwen/Qwen2.5-72B-Instruct",
    name: "Qwen 2.5 72B Instruct",
    description: "Alibaba's powerful instruction model",
    pricingTier: "FREE_LIMITED",
    available: true,
  },
  {
    id: "Qwen/Qwen2.5-7B-Instruct",
    name: "Qwen 2.5 7B Instruct",
    description: "Alibaba's efficient model",
    pricingTier: "FREE_LIMITED",
    available: true,
  },
  // Code models
  {
    id: "bigcode/starcoder2-15b",
    name: "StarCoder2 15B",
    description: "Code generation specialist",
    pricingTier: "FREE_LIMITED",
    available: true,
  },
  {
    id: "codellama/CodeLlama-34b-Instruct-hf",
    name: "CodeLlama 34B Instruct",
    description: "Meta's code-focused model",
    pricingTier: "FREE_LIMITED",
    available: true,
  },
];

// OpenRouter models - Access many providers through one API
export const OPENROUTER_MODELS: AIModel[] = [
  // OpenAI via OpenRouter
  {
    id: "openai/gpt-4o",
    name: "GPT-4o (via OpenRouter)",
    description: "OpenAI's multimodal flagship model",
    pricingTier: "PAID",
    available: true,
  },
  {
    id: "openai/gpt-4o-mini",
    name: "GPT-4o Mini (via OpenRouter)",
    description: "Fast and affordable GPT-4 variant",
    pricingTier: "PAID",
    available: true,
  },
  {
    id: "openai/gpt-4-turbo",
    name: "GPT-4 Turbo (via OpenRouter)",
    description: "High capability with 128K context",
    pricingTier: "PAID",
    available: true,
  },
  // Anthropic via OpenRouter
  {
    id: "anthropic/claude-3.5-sonnet",
    name: "Claude 3.5 Sonnet (via OpenRouter)",
    description: "Anthropic's best balanced model",
    pricingTier: "PAID",
    available: true,
  },
  {
    id: "anthropic/claude-3-opus",
    name: "Claude 3 Opus (via OpenRouter)",
    description: "Most powerful Claude model",
    pricingTier: "PAID_PREMIUM",
    available: true,
  },
  {
    id: "anthropic/claude-3-haiku",
    name: "Claude 3 Haiku (via OpenRouter)",
    description: "Fast and efficient Claude model",
    pricingTier: "PAID",
    available: true,
  },
  // Google via OpenRouter
  {
    id: "google/gemini-pro-1.5",
    name: "Gemini Pro 1.5 (via OpenRouter)",
    description: "Google's latest with 1M context",
    pricingTier: "PAID",
    available: true,
  },
  {
    id: "google/gemini-flash-1.5",
    name: "Gemini Flash 1.5 (via OpenRouter)",
    description: "Fast and cost-effective Gemini",
    pricingTier: "PAID",
    available: true,
  },
  // Meta Llama via OpenRouter
  {
    id: "meta-llama/llama-3.1-405b-instruct",
    name: "Llama 3.1 405B (via OpenRouter)",
    description: "Largest open-source Llama model",
    pricingTier: "PAID",
    available: true,
  },
  {
    id: "meta-llama/llama-3.1-70b-instruct",
    name: "Llama 3.1 70B (via OpenRouter)",
    description: "Large and capable Llama model",
    pricingTier: "PAID",
    available: true,
  },
  {
    id: "meta-llama/llama-3.1-8b-instruct",
    name: "Llama 3.1 8B (via OpenRouter)",
    description: "Efficient Llama model",
    pricingTier: "FREE_LIMITED",
    available: true,
  },
  // Mistral via OpenRouter
  {
    id: "mistralai/mistral-large",
    name: "Mistral Large (via OpenRouter)",
    description: "Mistral's flagship model",
    pricingTier: "PAID",
    available: true,
  },
  {
    id: "mistralai/mistral-medium",
    name: "Mistral Medium (via OpenRouter)",
    description: "Balanced Mistral model",
    pricingTier: "PAID",
    available: true,
  },
  {
    id: "mistralai/mixtral-8x7b-instruct",
    name: "Mixtral 8x7B (via OpenRouter)",
    description: "Mixture of experts model",
    pricingTier: "PAID",
    available: true,
  },
  // Cohere via OpenRouter
  {
    id: "cohere/command-r-plus",
    name: "Command R+ (via OpenRouter)",
    description: "Cohere's enterprise-grade model",
    pricingTier: "PAID",
    available: true,
  },
  {
    id: "cohere/command-r",
    name: "Command R (via OpenRouter)",
    description: "Cohere's efficient RAG model",
    pricingTier: "PAID",
    available: true,
  },
  // DeepSeek via OpenRouter
  {
    id: "deepseek/deepseek-chat",
    name: "DeepSeek Chat (via OpenRouter)",
    description: "High-performance Chinese model",
    pricingTier: "PAID",
    available: true,
  },
  {
    id: "deepseek/deepseek-coder",
    name: "DeepSeek Coder (via OpenRouter)",
    description: "Specialized for coding tasks",
    pricingTier: "PAID",
    available: true,
  },
  // Perplexity via OpenRouter
  {
    id: "perplexity/llama-3.1-sonar-large-128k-online",
    name: "Sonar Large Online (via OpenRouter)",
    description: "Web-connected for real-time info",
    pricingTier: "PAID",
    available: true,
  },
  // Qwen via OpenRouter
  {
    id: "qwen/qwen-2.5-72b-instruct",
    name: "Qwen 2.5 72B (via OpenRouter)",
    description: "Alibaba's powerful model",
    pricingTier: "PAID",
    available: true,
  },
  {
    id: "qwen/qwen-2.5-7b-instruct",
    name: "Qwen 2.5 7B (via OpenRouter)",
    description: "Alibaba's efficient model",
    pricingTier: "FREE_LIMITED",
    available: true,
  },
  // Free/Low-cost tier models (use for testing)
  {
    id: "google/gemma-2-9b-it:free",
    name: "Gemma 2 9B (Free via OpenRouter)",
    description: "Free tier Google model",
    pricingTier: "FREE",
    available: true,
  },
  {
    id: "meta-llama/llama-3.2-3b-instruct:free",
    name: "Llama 3.2 3B (Free via OpenRouter)",
    description: "Free tier Meta model",
    pricingTier: "FREE",
    available: true,
  },
  {
    id: "microsoft/phi-3-mini-128k-instruct:free",
    name: "Phi-3 Mini (Free via OpenRouter)",
    description: "Free tier Microsoft model",
    pricingTier: "FREE",
    available: true,
  },
];

export function getPricingTierLabel(tier: ModelPricingTier): string {
  switch (tier) {
    case "FREE":
      return "Free";
    case "FREE_LIMITED":
      return "Free (Limited)";
    case "PAID":
      return "Paid";
    case "PAID_PREMIUM":
      return "Paid (Premium)";
    default:
      return tier;
  }
}

export function getPricingTierColor(tier: ModelPricingTier): string {
  switch (tier) {
    case "FREE":
      return "text-green-600 dark:text-green-400";
    case "FREE_LIMITED":
      return "text-blue-600 dark:text-blue-400";
    case "PAID":
      return "text-orange-600 dark:text-orange-400";
    case "PAID_PREMIUM":
      return "text-purple-600 dark:text-purple-400";
    default:
      return "text-muted-foreground";
  }
}

