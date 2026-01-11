# OpenRouter Integration

> **Last Updated:** 2026-01-09  
> **Status:** ✅ Active

## Overview

OpenRouter is a unified AI gateway that provides access to 100+ AI models from multiple providers (OpenAI, Anthropic, Google, Meta, Mistral, Cohere, and more) through a single API. It simplifies model management by offering:

- **Single API key** for all supported models
- **Unified billing** across providers
- **Automatic fallbacks** if a provider is down
- **Access to models** you might not have direct access to
- **Competitive pricing** with transparent cost tracking

## Cost Considerations

OpenRouter charges per API usage with a small markup over the base provider price:
- **Pricing**: Provider base price + OpenRouter fee (typically 1-5%)
- **Free tier models**: Some models are available for free (rate-limited)
- **Pay-as-you-go**: Add credits at [openrouter.ai/credits](https://openrouter.ai/credits)
- **Spending limits**: Set limits in your OpenRouter account settings

## External Setup

### Prerequisites
- [ ] OpenRouter account at [openrouter.ai](https://openrouter.ai)

### Step 1: Create an OpenRouter Account

1. Visit [https://openrouter.ai](https://openrouter.ai)
2. Click **Sign In** (top right)
3. Sign in using:
   - Google account
   - GitHub account
   - Email

### Step 2: Generate Your API Key

1. Once logged in, click your profile icon → **Keys** or visit [openrouter.ai/keys](https://openrouter.ai/keys)
2. Click **Create Key**
3. Give your API key a descriptive name (e.g., "Snappier Workflows")
4. Optionally set a credit limit for the key
5. Click **Create**
6. **Important**: Copy your API key immediately! It starts with `sk-or-`
7. Store it securely - you won't be able to see it again

### Step 3: Add Credits (Optional for Free Models)

1. Visit [openrouter.ai/credits](https://openrouter.ai/credits)
2. Add credits to your account to access paid models
3. Set spending alerts if desired

## Environment Variables

```env
# No environment variables needed - API key stored in credentials
```

OpenRouter uses API key authentication stored in the encrypted credentials system, not environment variables.

## Codebase Files

| File | Purpose |
|------|---------|
| `src/features/executions/components/openrouter/executor.ts` | Node execution logic |
| `src/features/executions/components/openrouter/dialog.tsx` | Node configuration UI |
| `src/features/executions/components/openrouter/node.tsx` | Workflow node component |
| `src/features/executions/components/openrouter/actions.ts` | Server actions for realtime tokens |
| `src/inngest/channels/openrouter.ts` | Realtime execution updates |
| `src/config/ai-models.ts` | OPENROUTER_MODELS configuration |
| `prisma/schema.prisma` | NodeType enum includes `OPENROUTER` |

## Operations Supported

| Operation | Description | Required Fields | Optional Fields |
|-----------|-------------|-----------------|-----------------|
| `chat` | Generate text response | `credential`, `model`, `userPrompt` | `systemPrompt` |

## Available Models

### OpenAI (via OpenRouter)
| Model ID | Description |
|----------|-------------|
| `openai/gpt-4o` | Multimodal flagship model |
| `openai/gpt-4o-mini` | Fast and affordable GPT-4 variant (Default) |
| `openai/gpt-4-turbo` | High capability with 128K context |

### Anthropic (via OpenRouter)
| Model ID | Description |
|----------|-------------|
| `anthropic/claude-3.5-sonnet` | Best balanced Claude model |
| `anthropic/claude-3-opus` | Most powerful Claude model |
| `anthropic/claude-3-haiku` | Fast and efficient |

### Google (via OpenRouter)
| Model ID | Description |
|----------|-------------|
| `google/gemini-pro-1.5` | Latest with 1M context |
| `google/gemini-flash-1.5` | Fast and cost-effective |

### Meta Llama (via OpenRouter)
| Model ID | Description |
|----------|-------------|
| `meta-llama/llama-3.1-405b-instruct` | Largest open-source model |
| `meta-llama/llama-3.1-70b-instruct` | Large and capable |
| `meta-llama/llama-3.1-8b-instruct` | Efficient (free tier available) |

### Mistral (via OpenRouter)
| Model ID | Description |
|----------|-------------|
| `mistralai/mistral-large` | Mistral's flagship |
| `mistralai/mixtral-8x7b-instruct` | Mixture of experts |

### Free Tier Models
| Model ID | Description |
|----------|-------------|
| `google/gemma-2-9b-it:free` | Free tier Google model |
| `meta-llama/llama-3.2-3b-instruct:free` | Free tier Meta model |
| `microsoft/phi-3-mini-128k-instruct:free` | Free tier Microsoft model |

**Note:** Free tier models are rate-limited and subject to change. Check [openrouter.ai/models](https://openrouter.ai/models) for the latest available free models.

For a complete list, visit [openrouter.ai/docs#models](https://openrouter.ai/docs#models)

## Credential Flow

```
1. User navigates to Credentials page
2. Clicks "New Credential" → Selects "OpenRouter"
3. Enters API key (starts with sk-or-)
4. Key stored encrypted in Credential record
5. Credential available in OpenRouter node selector
```

## Workflow Usage

### Adding the Node
1. Open workflow editor
2. Click **+** or drag from node palette
3. Select **"OpenRouter"** from AI nodes
4. Connect to previous nodes

### Configuration
1. **Variable Name:** Name to access output (e.g., `openrouterResponse`)
2. **Credential:** Select your OpenRouter API key
3. **Model:** Choose from 100+ available models
4. **System Prompt:** (Optional) Set AI behavior
5. **User Prompt:** Your prompt/question

### Example: Multi-Model Comparison
```
Variable Name: gptResponse
Model: openai/gpt-4o-mini
System Prompt: You are a helpful assistant.
User Prompt: Analyze this data: {{httpResponse.data}}
```

### Example: Using Claude via OpenRouter
```
Variable Name: claudeResponse
Model: anthropic/claude-3.5-sonnet
System Prompt: You are an expert content writer.
User Prompt: Write a blog post about {{topic}}
```

### Example: Free Model for Testing
```
Variable Name: testResponse
Model: google/gemma-2-9b-it:free
System Prompt: You are a helpful assistant.
User Prompt: Summarize: {{inputText}}
```

### Accessing Output
```handlebars
{{openrouterResponse.text}}
```

## Integration with Existing AI Nodes

OpenRouter complements (does not replace) your existing AI integrations:

| Scenario | Recommendation |
|----------|----------------|
| Direct access to OpenAI | Use OpenAI node for lowest cost |
| Need Claude + GPT in same workflow | Use OpenRouter for unified billing |
| Testing multiple models | Use OpenRouter for easy switching |
| Provider API is down | OpenRouter can provide fallback |
| Access to Llama, Mistral, etc. | OpenRouter provides access |

## Troubleshooting

### Common Issues

#### Issue: "Invalid API Key"
**Cause:** API key is incorrect or expired  
**Solution:** 
1. Visit [openrouter.ai/keys](https://openrouter.ai/keys)
2. Create a new API key
3. Update your credential in Snappier

#### Issue: "Insufficient Credits"
**Cause:** Your OpenRouter account has no credits  
**Solution:** 
1. Visit [openrouter.ai/credits](https://openrouter.ai/credits)
2. Add credits to your account
3. Or switch to a free-tier model

#### Issue: "Model Not Found"
**Cause:** Model ID is incorrect or model was deprecated  
**Solution:** 
1. Check [openrouter.ai/docs#models](https://openrouter.ai/docs#models)
2. Select a valid model from the dropdown
3. Model IDs are case-sensitive (e.g., `openai/gpt-4o`)

#### Issue: "Rate Limit Exceeded"
**Cause:** Too many requests in a short time  
**Solution:** 
1. Wait 1-2 minutes and retry
2. Consider upgrading your usage tier
3. Reduce workflow execution frequency

## API Reference

OpenRouter uses an OpenAI-compatible API:
- **Base URL:** `https://openrouter.ai/api/v1`
- **Authentication:** Bearer token with API key
- **Headers:** 
  - `HTTP-Referer`: Your app URL (for analytics)
  - `X-Title`: Your app name (shown in OpenRouter dashboard)

For more details, see [OpenRouter Documentation](https://openrouter.ai/docs).
