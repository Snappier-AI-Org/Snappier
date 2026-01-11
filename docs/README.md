# Nodebase Documentation

Welcome to the Nodebase documentation. This folder contains comprehensive guides for setting up and using integrations, understanding the architecture, and deploying the application.

## 📁 Documentation Structure

```
docs/
├── README.md                    # This file - documentation overview
├── getting-started/
│   └── README.md               # Installation & setup guides
├── integrations/
│   ├── README.md               # Integration overview & patterns
│   ├── ai/                     # AI provider integrations
│   ├── google/                 # Google service integrations
│   ├── social/                 # Social media integrations
│   ├── productivity/           # Productivity tool integrations
│   └── communication/          # Communication platform integrations
├── architecture/
│   └── README.md               # System architecture documentation
└── deployment/
    └── README.md               # Deployment guides
```

## 🔗 Quick Links

### Integrations
- [Integration Overview](./integrations/README.md) - How integrations work
- [AI Integrations](./integrations/ai/) - OpenAI, Anthropic, Gemini, Groq, Hugging Face
- [Google Integrations](./integrations/google/) - Gmail, Docs, Sheets, Drive, Calendar
- [Social Integrations](./integrations/social/) - Instagram, Telegram, WhatsApp
- [Productivity Integrations](./integrations/productivity/) - Notion, Trello, GitHub
- [Communication Integrations](./integrations/communication/) - Slack, Discord, Outlook

### Architecture
- [Workflow Execution](./architecture/README.md#workflow-execution)
- [Credential System](./architecture/README.md#credential-system)
- [Realtime Updates](./architecture/README.md#realtime-updates)

### Deployment
- [Environment Variables](./deployment/README.md#environment-variables)
- [Vercel Deployment](./deployment/README.md#vercel-deployment)

## 📝 Documentation Standards

When adding new integration documentation, follow the template in [Integration Template](./integrations/_TEMPLATE.md).

Each integration document should include:
1. **Overview** - What the integration does
2. **External Setup** - Steps in the external service (console, dashboard, etc.)
3. **Environment Variables** - Required configuration
4. **Codebase Files** - Which files handle what
5. **Operations Supported** - Available actions
6. **Troubleshooting** - Common issues and solutions

## 🤝 Contributing to Docs

1. Use the templates provided
2. Include screenshots where helpful
3. Keep external setup steps detailed (URLs, button names, etc.)
4. Update this README when adding new sections
