# [Integration Name] Integration

> **Last Updated:** YYYY-MM-DD  
> **Status:** ✅ Active | 🚧 In Development | ⚠️ Deprecated

## Overview

Brief description of what this integration does and its primary use cases.

## External Setup

### Prerequisites
- [ ] Account on [Service Name](https://service-url.com)
- [ ] Any required subscriptions or plans
- [ ] Developer/API access enabled

### Step 1: [First Setup Step]

1. Go to [Service Dashboard](https://dashboard-url.com)
2. Navigate to **Section** → **Subsection**
3. Click **"Button Name"**
4. Configure the following:
   - Setting 1: `value`
   - Setting 2: `value`

> 📸 **Screenshot suggestion:** Add a screenshot showing this step

### Step 2: Create OAuth App / API Key

<!-- For OAuth-based integrations -->
1. Go to [Developer Console](https://console.url.com)
2. Click **"Create App"** or **"New Project"**
3. Fill in the application details:
   - App Name: `Snappier`
   - App Type: `Web Application`
4. Configure redirect URIs:
   - Development: `http://localhost:3000/api/integrations/{service}/callback`
   - Production: `https://your-domain.com/api/integrations/{service}/callback`

<!-- For API key integrations -->
1. Go to [API Settings](https://api.url.com)
2. Click **"Create API Key"**
3. Copy the key (usually starts with `prefix_`)

### Step 3: Configure Scopes/Permissions

List the required scopes or permissions:
- `scope.read` - Description of what this allows
- `scope.write` - Description of what this allows

### Step 4: [Additional Setup Steps]

Any webhooks, additional configurations, etc.

## Environment Variables

```env
# Required
SERVICE_CLIENT_ID="your-client-id"
SERVICE_CLIENT_SECRET="your-client-secret"
SERVICE_REDIRECT_URL="http://localhost:3000/api/integrations/{service}/callback"

# Optional
SERVICE_WEBHOOK_SECRET="webhook-signing-secret"
```

| Variable | Required | Description |
|----------|----------|-------------|
| `SERVICE_CLIENT_ID` | Yes | OAuth client ID from developer console |
| `SERVICE_CLIENT_SECRET` | Yes | OAuth client secret |
| `SERVICE_REDIRECT_URL` | Yes | Must match configured redirect URI |
| `SERVICE_WEBHOOK_SECRET` | No | For webhook signature verification |

## Codebase Files

| File | Purpose |
|------|---------|
| `src/app/api/integrations/{service}/connect/route.ts` | OAuth initiation endpoint |
| `src/app/api/integrations/{service}/callback/route.ts` | OAuth callback handler |
| `src/app/api/integrations/{service}/disconnect/route.ts` | Disconnect/revoke access |
| `src/features/executions/components/{service}/executor.ts` | Node execution logic |
| `src/features/executions/components/{service}/dialog.tsx` | Node configuration UI |
| `src/features/executions/components/{service}/node.tsx` | Workflow node component |
| `src/inngest/channels/{service}.ts` | Realtime execution updates |
| `prisma/schema.prisma` | NodeType enum includes `{SERVICE}` |

## Operations Supported

| Operation | Description | Required Fields | Optional Fields |
|-----------|-------------|-----------------|-----------------|
| `operation_1` | What it does | `field1`, `field2` | `field3` |
| `operation_2` | What it does | `field1` | `field2`, `field3` |

## Credential Flow

```
1. User navigates to Credentials page
2. Clicks "New Credential" → Selects "{Service Name}"
3. Redirected to {Service} OAuth consent screen
4. User grants permissions
5. Callback stores tokens in encrypted Credential record
6. Credential available in workflow node selector
```

## Token Management

- **Access Token Expiry:** X hours
- **Refresh Token:** Yes/No
- **Auto-refresh:** Implemented in `executor.ts` with X-minute buffer
- **Token Storage:** Encrypted in `Credential.encryptedData` field

## Workflow Usage

### Adding the Node
1. Open workflow editor
2. Click **+** or drag from node palette
3. Select **"{Node Name}"** from the list
4. Connect to previous nodes

### Configuration
1. **Variable Name:** Name to access output (e.g., `myServiceResult`)
2. **Credential:** Select your connected account
3. **Operation:** Choose the action to perform
4. **[Operation-specific fields]**

### Accessing Output
```handlebars
{{variableName.field}}
{{myServiceResult.data}}
```

## Triggers (if applicable)

### Supported Events
- `event_name` - When X happens

### Webhook Setup
1. Webhook URL: `https://your-domain.com/api/webhooks/{service}`
2. Events to subscribe: X, Y, Z
3. Signature verification: Enabled

## Troubleshooting

### Common Issues

#### Issue: "Error message here"
**Cause:** Why this happens  
**Solution:** How to fix it

#### Issue: "Token expired"
**Cause:** Access token has expired and refresh failed  
**Solution:** 
1. Go to Credentials page
2. Delete the existing credential
3. Create a new credential and re-authenticate

#### Issue: "Permission denied"
**Cause:** Missing required scopes  
**Solution:** 
1. Check the OAuth app has all required scopes
2. Reconnect to grant new permissions

### Debug Tips
- Check browser console for frontend errors
- Check server logs for API errors
- Verify environment variables are set correctly
- Test with a fresh credential if issues persist

## Changelog

| Date | Change |
|------|--------|
| YYYY-MM-DD | Initial integration release |
| YYYY-MM-DD | Added X operation |
| YYYY-MM-DD | Fixed token refresh issue |

## Related Documentation

- [Official API Documentation](https://docs.service.com)
- [OAuth Guide](https://docs.service.com/oauth)
- [Snappier Architecture](../architecture/README.md)
