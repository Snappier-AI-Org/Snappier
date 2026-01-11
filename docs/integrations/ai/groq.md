# Groq Integration

> **Last Updated:** 2026-01-07  
> **Status:** ✅ Active

## Overview

Groq provides ultra-fast AI inference powered by their custom Language Processing Unit (LPU) technology. They offer access to popular open-source language models like Llama, Mixtral, and Gemma with blazing-fast response times - up to 10x faster than traditional GPU-based inference.

## External Setup

### Prerequisites
- [ ] Groq account at [console.groq.com](https://console.groq.com)

### Step 1: Create a Groq Account

1. Visit [https://console.groq.com](https://console.groq.com)
2. Click **Sign Up** or **Log In** if you already have an account
3. You can sign up using:
   - Email and password
   - Google account
   - GitHub account

### Step 2: Generate Your API Key

1. Once logged in, navigate to the **API Keys** section in the left sidebar
2. Click the **Create API Key** button
3. Give your API key a descriptive name (e.g., "Nodebase Workflows")
4. Click **Submit** or **Create**
5. **Important**: Copy your API key immediately! It starts with `gsk_`
6. Store it securely - you won't be able to see it again

## Environment Variables

```env
# No environment variables needed - API key stored in credentials
```

Groq uses API key authentication stored in the encrypted credentials system, not environment variables.

## Codebase Files

| File | Purpose |
|------|---------|
| `src/features/executions/components/groq/executor.ts` | Node execution logic |
| `src/features/executions/components/groq/dialog.tsx` | Node configuration UI |
| `src/features/executions/components/groq/node.tsx` | Workflow node component |
| `src/inngest/channels/groq.ts` | Realtime execution updates |
| `prisma/schema.prisma` | NodeType enum includes `GROQ` |

## Operations Supported

| Operation | Description | Required Fields | Optional Fields |
|-----------|-------------|-----------------|-----------------|
| `chat` | Generate text response | `credential`, `model`, `userPrompt` | `systemPrompt` |

## Available Models

### Llama Models (Meta)
| Model ID | Description |
|----------|-------------|
| `llama-3.3-70b-versatile` | Latest generation, excellent for general tasks (Default) |
| `llama-3.1-70b-versatile` | Previous generation, very capable |
| `llama-3.1-8b-instant` | Fastest Llama model, great for simple tasks |
| `llama3-70b-8192` | Earlier Llama 3, 8K context |
| `llama3-8b-8192` | Smaller earlier Llama 3 |

### Mixtral (Mistral AI)
| Model ID | Description |
|----------|-------------|
| `mixtral-8x7b-32768` | Mixture of experts, 32K context window |

### Gemma (Google)
| Model ID | Description |
|----------|-------------|
| `gemma2-9b-it` | Google's latest compact model |
| `gemma-7b-it` | Smaller, faster Gemma variant |

## Credential Flow

```
1. User navigates to Credentials page
2. Clicks "New Credential" → Selects "Groq"
3. Enters API key (starts with gsk_)
4. Key stored encrypted in Credential record
5. Credential available in Groq node selector
```

## Workflow Usage

### Adding the Node
1. Open workflow editor
2. Click **+** or drag from node palette
3. Select **"Groq"** from AI nodes
4. Connect to previous nodes

### Configuration
1. **Variable Name:** Name to access output (e.g., `groqResponse`)
2. **Credential:** Select your Groq API key
3. **Model:** Choose from available models
4. **System Prompt:** (Optional) Set AI behavior
5. **User Prompt:** Your prompt/question

### Example: Text Summarization
```
Variable Name: summarizer
Model: llama-3.3-70b-versatile
System Prompt: You are a helpful assistant that creates concise summaries.
User Prompt: Summarize the following text: {{httpResponse.data}}
```

### Example: Code Generation
```
Variable Name: codeGenerator
Model: llama-3.1-70b-versatile
System Prompt: You are an expert programmer. Generate clean, well-documented code.
User Prompt: Create a Python function that {{userInput}}
```

### Accessing Output
```handlebars
{{groqResponse.text}}
```

## Rate Limits and Pricing

### Free Tier
Groq offers a generous free tier:
- 30 requests per minute
- 14,400 requests per day
- 7,000 tokens per minute (varies by model)

### Paid Tier
For higher limits, upgrade at [console.groq.com](https://console.groq.com)

## Troubleshooting

### Issue: "Invalid API Key"
**Cause:** API key is incorrect or expired  
**Solution:** 
1. Verify key starts with `gsk_`
2. Generate a new key if needed
3. Update credential with new key

### Issue: "Rate limit exceeded"
**Cause:** Too many requests in short time  
**Solution:** 
1. Wait a moment before retrying
2. Consider upgrading to paid tier
3. Use smaller models for faster processing

### Issue: "Model not found"
**Cause:** Model ID is incorrect or deprecated  
**Solution:** 
1. Use the default model (llama-3.3-70b-versatile)
2. Check Groq docs for current model IDs

## Changelog

| Date | Change |
|------|--------|
| 2026-01-06 | Initial Groq integration release |

## Related Documentation

- [Groq Console](https://console.groq.com)
- [Groq API Documentation](https://console.groq.com/docs)
- [AI Integrations Overview](./README.md)
