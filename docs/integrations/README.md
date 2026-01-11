# Integrations Overview

This section documents all integrations available in Nodebase. Each integration guide covers external setup, environment configuration, and usage.

## Integration Categories

### 🤖 AI Providers
| Integration | Status | Documentation |
|-------------|--------|---------------|
| OpenAI | ✅ Active | [Guide](./ai/openai.md) |
| Anthropic | ✅ Active | [Guide](./ai/anthropic.md) |
| Google Gemini | ✅ Active | [Guide](./ai/gemini.md) |
| Groq | ✅ Active | [Guide](./ai/groq.md) |
| Hugging Face | ✅ Active | [Guide](./ai/huggingface.md) |

### 🔷 Google Services
| Integration | Status | Documentation |
|-------------|--------|---------------|
| Gmail | ✅ Active | [Guide](./google/gmail.md) |
| Google Docs | ✅ Active | [Guide](./google/google-docs.md) |
| Google Sheets | ✅ Active | [Guide](./google/google-sheets.md) |
| Google Drive | ✅ Active | [Guide](./google/google-drive.md) |
| Google Calendar | ✅ Active | [Guide](./google/google-calendar.md) |

### 📱 Social Media
| Integration | Status | Documentation |
|-------------|--------|---------------|
| Meta Instagram | ✅ Active | [Guide](./social/instagram.md) |
| Telegram | ✅ Active | [Guide](./social/telegram.md) |
| WhatsApp | ✅ Active | [Guide](./social/whatsapp.md) |
| Zalo | ✅ Active | [Guide](./social/zalo.md) |

### 📋 Productivity
| Integration | Status | Documentation |
|-------------|--------|---------------|
| Notion | ✅ Active | [Guide](./productivity/notion.md) |
| Trello | ✅ Active | [Guide](./productivity/trello.md) |
| GitHub | ✅ Active | [Guide](./productivity/github.md) |
| Todoist | ✅ Active | [Guide](./productivity/todoist.md) |

### 💬 Communication
| Integration | Status | Documentation |
|-------------|--------|---------------|
| Slack | ✅ Active | [Guide](./communication/slack.md) |
| Discord | ✅ Active | [Guide](./communication/discord.md) |
| Outlook | ✅ Active | [Guide](./communication/outlook.md) |

## Integration Patterns

### OAuth Flow (Most Google/Social Integrations)
```
User clicks Connect
       ↓
/api/integrations/{service}/connect
       ↓
Redirect to OAuth Provider (Google, Meta, etc.)
       ↓
User grants permissions
       ↓
/api/integrations/{service}/callback
       ↓
Tokens stored in Credential table (encrypted)
       ↓
Available in workflow node credential selector
```

### API Key Flow (AI Providers)
```
User creates credential
       ↓
Enters API key from provider dashboard
       ↓
Key stored in Credential table (encrypted)
       ↓
Available in AI node credential selector
```

### Webhook/Trigger Flow
```
User enables trigger in workflow
       ↓
Webhook URL generated or registered with service
       ↓
External service sends events to webhook
       ↓
Inngest receives and processes event
       ↓
Workflow execution triggered
```

## Codebase Structure for Integrations

Each integration typically has these files:

```
src/
├── app/api/integrations/{service}/
│   ├── connect/route.ts      # OAuth initiation
│   ├── callback/route.ts     # OAuth callback
│   └── disconnect/route.ts   # Disconnect account
├── features/executions/components/{service}/
│   ├── executor.ts           # Node execution logic
│   ├── dialog.tsx            # Configuration UI
│   └── node.tsx              # Node component
└── inngest/channels/{service}.ts  # Realtime status updates
```

## Adding a New Integration

1. Copy the template from [_TEMPLATE.md](./_TEMPLATE.md)
2. Fill in all sections
3. Add to the appropriate category folder
4. Update this README with the new entry
5. Update the main [docs/README.md](../README.md) if needed
