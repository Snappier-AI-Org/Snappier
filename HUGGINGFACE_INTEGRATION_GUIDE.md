# Hugging Face AI Integration Guide

## Overview
This integration allows you to use Hugging Face's text generation models in your workflows, similar to OpenAI, Anthropic, and Gemini nodes.

## Getting Your API Key

1. Visit [Hugging Face Settings - Tokens](https://huggingface.co/settings/tokens)
2. Click **"Create new token"** or **"New token"**
3. Give your token a name (e.g., "Snappier Workflow")
4. Select the permission type:
   - **Read** permission is sufficient for text generation
   - For advanced features, you may need **Write** permissions
5. Click **"Generate token"**
6. **Copy the token immediately** - it starts with `hf_`
7. Store it securely in your Snappier credentials

## Available Models

The integration includes 12+ popular models:

### General Purpose Models
- **Mistral-7B-Instruct-v0.3** (Default) - Fast and efficient
- **Mixtral-8x7B-Instruct-v0.1** - More powerful, mixture of experts
- **Llama-3.3-70B-Instruct** - Meta's latest, very capable
- **Llama-3.1-8B-Instruct** - Smaller but still powerful
- **Phi-4** - Microsoft's compact model
- **Gemma-2-27B-it** - Google's open model
- **Qwen2.5-72B-Instruct** - Alibaba's multilingual model

### Code-Specialized Models
- **StarCoder2-15B** - Code generation and completion
- **CodeLlama-70B-Instruct** - Meta's code-focused model

## Using the Hugging Face Node

1. **Create a Credential**
   - Go to Credentials page
   - Click "New Credential"
   - Select "Hugging Face"
   - Paste your API token (starts with `hf_`)
   - Save

2. **Add to Workflow**
   - Open your workflow editor
   - Click the "+" button or "Add Node"
   - Find "Hugging Face AI" under AI nodes
   - Drag it into your workflow

3. **Configure the Node**
   - **Variable Name**: Name for storing the AI response (e.g., `aiResponse`)
   - **Credential**: Select your Hugging Face credential
   - **Model**: Choose from available models (default: Mistral-7B-Instruct-v0.3)
   - **System Prompt** (optional): Set the AI's behavior/role
   - **User Prompt**: The actual question or instruction

4. **Use Variables**
   - Access previous node outputs using handlebars: `{{nodeName.variableName}}`
   - Example: `Summarize this text: {{httpRequest.data}}`

## Technical Implementation

### API Approach
The integration uses the official `@huggingface/inference` SDK to communicate with Hugging Face's Inference API. This ensures:
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

### "Not Found" Error
**Fixed!** The previous version used an incorrect API endpoint. The current version uses the official Hugging Face Inference SDK which works correctly.

### API Rate Limits
Free tier has rate limits. If you encounter limits:
- Wait a moment before retrying
- Consider upgrading to Hugging Face Pro
- Use smaller models for faster processing

### Model Not Available
Some models require:
- Acceptance of model license agreements on Hugging Face
- Pro subscription for certain models
- Specific token permissions

**Solution**: Try the default model (Mistral-7B-Instruct-v0.3) first, which works for everyone.

### Invalid API Key
- Ensure token starts with `hf_`
- Check token hasn't expired
- Verify token has "Read" permissions
- Recreate token if necessary

## Differences from Other AI Providers

| Feature | Hugging Face | OpenAI | Anthropic |
|---------|-------------|--------|-----------|
| Free Tier | ✅ Yes | ❌ No | ❌ No |
| Open Models | ✅ Yes | ❌ No | ❌ No |
| Code Models | ✅ StarCoder, CodeLlama | ✅ GPT-4 | ❌ No |
| Rate Limits | Moderate | High | High |
| Model Variety | 100,000+ | ~10 | ~5 |

## Best Practices

1. **Start with Default Model**: Mistral-7B is fast and reliable
2. **Use Specific Models**: Choose code models for code tasks
3. **System Prompts**: Guide model behavior for consistent results
4. **Error Handling**: Add Filter/Conditional nodes to handle failures
5. **Rate Limits**: Don't use in high-frequency workflows on free tier

## Example Workflows

### Text Summarization
```
Manual Trigger → Hugging Face AI → Slack Message
```
- Model: Mistral-7B-Instruct-v0.3
- System: "You are a helpful summarization assistant."
- User: "Summarize this in 2 sentences: {{trigger.text}}"

### Code Generation
```
HTTP Request → Hugging Face AI → GitHub
```
- Model: CodeLlama-70B-Instruct
- System: "You are an expert programmer."
- User: "Write a Python function that {{httpRequest.requirement}}"

### Multi-Language Translation
```
Gmail Trigger → Hugging Face AI → Notion
```
- Model: Qwen2.5-72B-Instruct
- System: "You are a translation expert."
- User: "Translate to Spanish: {{gmail.emailBody}}"

## Support

For issues:
1. Check credential is valid
2. Verify model name is correct
3. Review error messages for guidance
4. Test with default model first
5. Check Hugging Face status page

## Resources

- [Hugging Face Inference API Docs](https://huggingface.co/docs/api-inference/index)
- [Model Hub](https://huggingface.co/models)
- [Token Management](https://huggingface.co/settings/tokens)
- [Pricing](https://huggingface.co/pricing)
