# Groq AI Integration Guide

## What is Groq?

Groq provides ultra-fast AI inference powered by their custom Language Processing Unit (LPU) technology. They offer access to popular open-source language models like Llama, Mixtral, and Gemma with blazing-fast response times - up to 10x faster than traditional GPU-based inference.

## Getting Your Groq API Key

Follow these simple steps to get started with Groq:

### 1. Create a Groq Account

1. Visit [https://console.groq.com](https://console.groq.com)
2. Click **Sign Up** or **Log In** if you already have an account
3. You can sign up using:
   - Email and password
   - Google account
   - GitHub account

### 2. Generate Your API Key

1. Once logged in, navigate to the **API Keys** section in the left sidebar
2. Click the **Create API Key** button
3. Give your API key a descriptive name (e.g., "Nodebase Workflows")
4. Click **Submit** or **Create**
5. **Important**: Copy your API key immediately! It starts with `gsk_`
6. Store it securely - you won't be able to see it again

### 3. Add the API Key to Nodebase

1. In Nodebase, go to **Credentials** page
2. Click **New Credential**
3. Select **Groq** from the credential type dropdown
4. Give your credential a name (e.g., "My Groq API Key")
5. Paste your API key in the API Key field
6. Click **Create**

## Available Models

Groq offers several high-performance models:

### Llama Models (Meta)
- **Llama 3.3 70B Versatile** - Latest generation, excellent for general tasks
- **Llama 3.1 70B Versatile** - Previous generation, still very capable
- **Llama 3.1 8B Instant** - Fastest Llama model, great for simple tasks
- **Llama 3 70B / 8B** - Earlier Llama 3 versions

### Mixtral (Mistral AI)
- **Mixtral 8x7B** - Mixture of experts model with 32K context window

### Gemma (Google)
- **Gemma 2 9B** - Google's latest compact model
- **Gemma 7B** - Smaller, faster Gemma variant

## Using Groq in Your Workflows

### Basic Setup

1. Add a **Groq** node to your workflow from the AI nodes section
2. Double-click the node to configure it
3. Fill in the required fields:
   - **Variable Name**: Name for accessing the output (e.g., `myGroq`)
   - **Groq Credential**: Select the credential you created earlier
   - **Model**: Choose your preferred model (default: Llama 3.3 70B Versatile)
   - **System Prompt** (optional): Set the AI's behavior and context
   - **User Prompt**: The actual prompt/question for the AI

### Example: Text Summarization

```
Variable Name: summarizer
Model: llama-3.3-70b-versatile
System Prompt: You are a helpful assistant that creates concise summaries.
User Prompt: Summarize the following text: {{json httpResponse}}
```

### Example: Code Generation

```
Variable Name: codeGenerator
Model: llama-3.1-70b-versatile
System Prompt: You are an expert programmer. Generate clean, well-documented code.
User Prompt: Create a Python function that {{userInput}}
```

### Accessing Groq Outputs

After a Groq node executes, you can access its output in subsequent nodes:

- `{{myGroq.text}}` - The generated text response

## Rate Limits and Pricing

### Free Tier
Groq offers a generous free tier with rate limits:
- 30 requests per minute
- 14,400 requests per day
- 7,000 tokens per minute (varies by model)

### Paid Tier
For higher usage, Groq offers paid plans with:
- Higher rate limits
- Priority access
- No daily request caps

Visit [https://groq.com/pricing](https://groq.com/pricing) for current pricing details.

## Best Practices

### 1. Choose the Right Model
- **Llama 3.3 70B**: Best for complex reasoning and general tasks
- **Llama 3.1 8B Instant**: Best for speed and simple tasks
- **Mixtral 8x7B**: Best for tasks requiring long context

### 2. Optimize Your Prompts
- Be specific and clear in your prompts
- Use system prompts to set consistent behavior
- Test with smaller models first, then scale up if needed

### 3. Handle Variables Properly
- Use `{{variable}}` for simple text values
- Use `{{json variable}}` to stringify objects/arrays
- Always check that variables exist before using them

### 4. Monitor Your Usage
- Keep track of your API usage in the Groq console
- Set up alerts for approaching rate limits
- Consider upgrading if you hit limits frequently

## Troubleshooting

### "Credential not found" Error
- Make sure you've created and selected a Groq credential
- Verify the credential hasn't been deleted

### "Model not found" Error
- Check that the model ID is correct
- Some models may have been deprecated - use the latest versions

### Rate Limit Errors
- Wait a minute before retrying
- Consider using a smaller model for simple tasks
- Upgrade to a paid plan for higher limits

### Slow Responses
- Groq is typically very fast, but can be slower during peak times
- Try using a smaller model (8B instead of 70B)
- Check your internet connection

## Additional Resources

- **Groq Documentation**: [https://console.groq.com/docs](https://console.groq.com/docs)
- **Groq Playground**: [https://console.groq.com/playground](https://console.groq.com/playground)
- **Community Discord**: [https://groq.com/discord](https://groq.com/discord)
- **Status Page**: [https://status.groq.com](https://status.groq.com)

## Security Notes

⚠️ **Important Security Reminders:**

1. **Never share your API key** - It provides full access to your Groq account
2. **Don't commit API keys to git** - Use environment variables or credential management
3. **Rotate keys regularly** - Create new keys periodically for security
4. **Delete unused keys** - Remove old API keys you're no longer using
5. **Monitor usage** - Check for unexpected API calls that might indicate key compromise

If you suspect your API key has been compromised:
1. Immediately delete it in the Groq console
2. Create a new API key
3. Update your Nodebase credentials with the new key

---

**Need Help?** If you encounter issues, check the Nodebase documentation or reach out to support.
