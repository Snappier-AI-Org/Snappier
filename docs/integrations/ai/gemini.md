# Google Gemini Integration

> **Last Updated:** 2026-01-07  
> **Status:** ✅ Active

## Overview

Google Gemini integration allows you to use Gemini models for text generation in your workflows. Gemini offers multimodal capabilities and fast inference.

## External Setup

### Prerequisites
- [ ] Google Cloud account or Google AI Studio access

### Step 1: Get API Key (Google AI Studio - Easier)

1. Visit [Google AI Studio](https://aistudio.google.com/)
2. Click **"Get API key"**
3. Create a new API key or select existing project
4. Copy the key
5. Store securely

### Alternative: Google Cloud Console

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Enable **Generative Language API**
3. Go to **APIs & Services** → **Credentials**
4. Create API key

## Environment Variables

```env
# No environment variables needed - API key stored in credentials
```

## Codebase Files

| File | Purpose |
|------|---------|
| `src/features/executions/components/gemini/executor.ts` | Node execution logic |
| `src/features/executions/components/gemini/dialog.tsx` | Node configuration UI |
| `src/features/executions/components/gemini/node.tsx` | Workflow node component |

## Available Models

| Model | Description |
|-------|-------------|
| `gemini-pro` | Best for text generation |
| `gemini-pro-vision` | Supports image input |
| `gemini-1.5-pro` | Latest with 1M context |
| `gemini-1.5-flash` | Fast and cost-effective |

## Workflow Usage

1. Add Gemini node to workflow
2. Select your credential
3. Choose model
4. Set system prompt (optional)
5. Set user prompt

### Accessing Output
```handlebars
{{geminiResponse.text}}
```

## Troubleshooting

### Issue: "Invalid API Key"
Verify the key is copied correctly and has proper permissions.

### Issue: "Quota exceeded"
Check usage limits in Google Cloud Console or AI Studio.

## Related Documentation

- [Google AI Studio](https://aistudio.google.com/)
- [Gemini API Documentation](https://ai.google.dev/docs)
- [AI Integrations Overview](./README.md)
