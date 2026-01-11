# Anthropic (Claude) Integration

> **Last Updated:** 2026-01-07  
> **Status:** ✅ Active

## Overview

Anthropic integration allows you to use Claude models for text generation in your workflows. Claude excels at long-form content and nuanced reasoning.

## External Setup

### Prerequisites
- [ ] Anthropic account at [console.anthropic.com](https://console.anthropic.com)
- [ ] API access enabled

### Step 1: Get API Key

1. Visit [Anthropic Console](https://console.anthropic.com)
2. Navigate to **API Keys**
3. Click **"Create Key"**
4. Name your key (e.g., "Nodebase")
5. Copy the key immediately (starts with `sk-ant-`)
6. Store securely

## Environment Variables

```env
# No environment variables needed - API key stored in credentials
```

## Codebase Files

| File | Purpose |
|------|---------|
| `src/features/executions/components/anthropic/executor.ts` | Node execution logic |
| `src/features/executions/components/anthropic/dialog.tsx` | Node configuration UI |
| `src/features/executions/components/anthropic/node.tsx` | Workflow node component |

## Available Models

| Model | Description |
|-------|-------------|
| `claude-3-opus-20240229` | Most capable, best for complex tasks |
| `claude-3-sonnet-20240229` | Balanced performance and speed |
| `claude-3-haiku-20240307` | Fastest, most cost-effective |

## Workflow Usage

1. Add Anthropic node to workflow
2. Select your credential
3. Choose model
4. Set system prompt (optional)
5. Set user prompt

### Accessing Output
```handlebars
{{claudeResponse.text}}
```

## Troubleshooting

### Issue: "Invalid API Key"
Verify key starts with `sk-ant-` and is copied correctly.

### Issue: "Rate limited"
Wait and retry, or check your usage tier.

## Related Documentation

- [Anthropic API Documentation](https://docs.anthropic.com)
- [AI Integrations Overview](./README.md)
