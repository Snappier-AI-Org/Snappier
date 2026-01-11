# Social Media Integrations

This section covers social media platform integrations in Nodebase.

## Available Platforms

| Platform | Auth Type | Documentation |
|----------|-----------|---------------|
| Meta Instagram | OAuth 2.0 | [Guide](./instagram.md) |
| Telegram | Bot Token | [Guide](./telegram.md) |
| WhatsApp | Meta Business API | [Guide](./whatsapp.md) |
| Zalo | OAuth 2.0 | [Guide](./zalo.md) |

## Integration Types

### Triggers (Incoming Events)
- Instagram comment received
- Instagram DM received
- Telegram message received
- WhatsApp message received

### Actions (Outgoing)
- Reply to comments
- Send direct messages
- Send Telegram messages
- Send WhatsApp messages

## Common Pattern

Social integrations typically involve:
1. **OAuth/Token Setup** - Authenticate with the platform
2. **Webhook Configuration** - Receive events from the platform
3. **API Calls** - Send messages/actions back

See individual guides for platform-specific setup.
