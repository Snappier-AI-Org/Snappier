# AI Integrations

This section covers all AI provider integrations in Nodebase.

## Available AI Providers

| Provider | Type | Documentation |
|----------|------|---------------|
| OpenAI | API Key | [Guide](./openai.md) |
| Anthropic | API Key | [Guide](./anthropic.md) |
| Google Gemini | API Key | [Guide](./gemini.md) |
| Groq | API Key | [Guide](./groq.md) |
| Hugging Face | API Key | [Guide](./huggingface.md) |
| OpenRouter | API Key | [Guide](./openrouter.md) |

## Common Pattern

All AI integrations follow the same pattern:

### Credential Setup
1. Get API key from provider dashboard
2. Create credential in Nodebase
3. Select credential in AI node

### Node Configuration
| Field | Description |
|-------|-------------|
| Variable Name | Name to access the output (e.g., `aiResponse`) |
| Credential | Your saved API key |
| Model | The AI model to use |
| System Prompt | (Optional) Set AI behavior/role |
| User Prompt | Your actual prompt/question |

### Accessing Output
```handlebars
{{variableName.text}}
```

### Using Variables in Prompts
Reference previous node outputs:
```handlebars
Summarize this: {{httpRequest.data}}
Translate: {{previousNode.content}}
```

## Choosing a Provider

| Provider | Best For | Speed | Cost |
|----------|----------|-------|------|
| OpenAI | General purpose, GPT-4 quality | Medium | $$ |
| Anthropic | Long context, Claude models | Medium | $$ |
| Gemini | Multimodal, Google ecosystem | Fast | $ |
| Groq | Ultra-fast inference | Very Fast | $ |
| Hugging Face | Open-source models, flexibility | Varies | Free/$ |
| OpenRouter | Multi-provider access, unified billing | Varies | $+ |

> **OpenRouter Note:** OpenRouter provides access to 100+ models from multiple providers (OpenAI, Anthropic, Google, Meta, etc.) through a single API key. It adds a small markup but offers unified billing and easy model switching.
