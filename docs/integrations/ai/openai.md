# OpenAI Integration

> **Last Updated:** 2026-01-07  
> **Status:** ✅ Active

## Overview

OpenAI integration allows you to use GPT models (GPT-4, GPT-3.5-turbo) for text generation in your workflows.

## External Setup

### Prerequisites
- [ ] OpenAI account at [platform.openai.com](https://platform.openai.com)
- [ ] Payment method added (for API usage)

### Step 1: Get API Key

1. Visit [OpenAI API Keys](https://platform.openai.com/api-keys)
2. Click **"Create new secret key"**
3. Name your key (e.g., "Snappier")
4. Copy the key immediately (starts with `sk-`)
5. Store securely

## Environment Variables

```env
# No environment variables needed - API key stored in credentials
```

## Codebase Files

| File | Purpose |
|------|---------|
| `src/features/executions/components/openai/executor.ts` | Node execution logic |
| `src/features/executions/components/openai/dialog.tsx` | Node configuration UI |
| `src/features/executions/components/openai/node.tsx` | Workflow node component |

## Available Models

| Model | Description |
|-------|-------------|
| `gpt-4-turbo` | Most capable, best for complex tasks |
| `gpt-4` | High quality, slightly slower |
| `gpt-3.5-turbo` | Fast and cost-effective |

## Workflow Usage

1. Add OpenAI node to workflow
2. Select your credential
3. Choose model
4. Set system prompt (optional)
5. Set user prompt

### Accessing Output
```handlebars
{{openaiResponse.text}}
```

## Troubleshooting

### Issue: "Invalid API Key"
Verify key starts with `sk-` and is copied correctly.

### Issue: "Insufficient quota"
Add payment method or check usage limits at [platform.openai.com/usage](https://platform.openai.com/usage).

## Related Documentation

- [OpenAI API Documentation](https://platform.openai.com/docs)
- [AI Integrations Overview](./README.md)
