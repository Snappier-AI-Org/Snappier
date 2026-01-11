# Hugging Face Integration

> **Last Updated:** 2026-01-07  
> **Status:** ✅ Active

## Overview

This integration allows you to use Hugging Face's text generation models in your workflows. Hugging Face provides access to thousands of open-source models, giving you flexibility to choose the best model for your specific use case.

## External Setup

### Prerequisites
- [ ] Hugging Face account at [huggingface.co](https://huggingface.co)

### Step 1: Create a Hugging Face Account

1. Visit [https://huggingface.co](https://huggingface.co)
2. Click **Sign Up** in the top right
3. Create account with email or social login

### Step 2: Generate Your API Token

1. Visit [Hugging Face Settings - Tokens](https://huggingface.co/settings/tokens)
2. Click **"Create new token"** or **"New token"**
3. Give your token a name (e.g., "Snappier Workflow")
4. Select the permission type:
   - **Read** permission is sufficient for text generation
   - For advanced features, you may need **Write** permissions
5. Click **"Generate token"**
6. **Copy the token immediately** - it starts with `hf_`
7. Store it securely

## Environment Variables

```env
# No environment variables needed - API key stored in credentials
```

Hugging Face uses API token authentication stored in the encrypted credentials system.

## Codebase Files

| File | Purpose |
|------|---------|
| `src/features/executions/components/huggingface/executor.ts` | Node execution logic using `@huggingface/inference` SDK |
| `src/features/executions/components/huggingface/dialog.tsx` | Node configuration UI |
| `src/features/executions/components/huggingface/node.tsx` | Workflow node component |
| `src/inngest/channels/huggingface.ts` | Realtime execution updates |
| `prisma/schema.prisma` | NodeType enum includes `HUGGINGFACE` |

## Operations Supported

| Operation | Description | Required Fields | Optional Fields |
|-----------|-------------|-----------------|-----------------|
| `chat` | Generate text response | `credential`, `model`, `userPrompt` | `systemPrompt` |

## Available Models

### General Purpose Models
| Model ID | Description |
|----------|-------------|
| `mistralai/Mistral-7B-Instruct-v0.3` | Fast and efficient (Default) |
| `mistralai/Mixtral-8x7B-Instruct-v0.1` | More powerful, mixture of experts |
| `meta-llama/Llama-3.3-70B-Instruct` | Meta's latest, very capable |
| `meta-llama/Llama-3.1-8B-Instruct` | Smaller but still powerful |
| `microsoft/Phi-4` | Microsoft's compact model |
| `google/gemma-2-27b-it` | Google's open model |
| `Qwen/Qwen2.5-72B-Instruct` | Alibaba's multilingual model |

### Code-Specialized Models
| Model ID | Description |
|----------|-------------|
| `bigcode/starcoder2-15b` | Code generation and completion |
| `codellama/CodeLlama-70b-Instruct-hf` | Meta's code-focused model |

## Credential Flow

```
1. User navigates to Credentials page
2. Clicks "New Credential" → Selects "Hugging Face"
3. Enters API token (starts with hf_)
4. Token stored encrypted in Credential record
5. Credential available in Hugging Face node selector
```

## Workflow Usage

### Adding the Node
1. Open workflow editor
2. Click **+** or drag from node palette
3. Select **"Hugging Face AI"** from AI nodes
4. Connect to previous nodes

### Configuration
1. **Variable Name:** Name to access output (e.g., `hfResponse`)
2. **Credential:** Select your Hugging Face credential
3. **Model:** Choose from available models
4. **System Prompt:** (Optional) Set AI behavior/role
5. **User Prompt:** Your prompt/question

### Using Variables in Prompts
Access previous node outputs using handlebars:
```handlebars
Summarize this text: {{httpRequest.data}}
Translate: {{previousNode.content}}
```

### Accessing Output
```handlebars
{{hfResponse.text}}
```

## Technical Implementation

### API Approach
The integration uses the official `@huggingface/inference` SDK:
- ✅ Compatibility with all Hugging Face models
- ✅ Proper error handling
- ✅ Native chat completion support
- ✅ Works with free tier API tokens

### Key Features
- Real-time execution status via Inngest channels
- Template variable support with Handlebars
- Comprehensive error messages with guidance
- Model validation before API calls
- Encrypted credential storage

## Troubleshooting

### Issue: "Not Found" Error
**Cause:** Incorrect API endpoint or model ID  
**Solution:** The current version uses the official Hugging Face Inference SDK which handles endpoints correctly. Try the default model first.

### Issue: API Rate Limits
**Cause:** Free tier has rate limits  
**Solution:**
1. Wait a moment before retrying
2. Consider upgrading to Hugging Face Pro
3. Use smaller models for faster processing

### Issue: Model Not Available
**Cause:** Some models require special access  
**Solution:**
1. Accept model license agreements on Hugging Face website
2. Some models require Pro subscription
3. Check token has correct permissions
4. Try the default model (Mistral-7B-Instruct-v0.3) which works for everyone

### Issue: Invalid API Key
**Cause:** Token is incorrect or expired  
**Solution:**
1. Ensure token starts with `hf_`
2. Check token hasn't expired
3. Verify token has "Read" permissions
4. Recreate token if necessary

## Rate Limits

### Free Tier
- Limited requests per hour
- Some models may be rate-limited
- Smaller models have higher limits

### Pro Tier
- Higher rate limits
- Access to gated models
- Priority inference

## Changelog

| Date | Change |
|------|--------|
| 2026-01-07 | Initial Hugging Face integration release |
| 2026-01-07 | Fixed API endpoint using official SDK |

## Related Documentation

- [Hugging Face](https://huggingface.co)
- [Hugging Face Inference API](https://huggingface.co/docs/api-inference)
- [Hugging Face Tokens](https://huggingface.co/settings/tokens)
- [AI Integrations Overview](./README.md)
