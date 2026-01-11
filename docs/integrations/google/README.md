# Google Integrations

This section covers all Google service integrations in Snappier.

## Available Google Services

| Service | Auth Type | Documentation |
|---------|-----------|---------------|
| Gmail | OAuth 2.0 | [Guide](./gmail.md) |
| Google Docs | OAuth 2.0 | [Guide](./google-docs.md) |
| Google Sheets | OAuth 2.0 | [Guide](./google-sheets.md) |
| Google Drive | OAuth 2.0 | [Guide](./google-drive.md) |
| Google Calendar | OAuth 2.0 | [Guide](./google-calendar.md) |

## Common Setup: Google Cloud Console

All Google integrations require OAuth credentials from Google Cloud Console. Here's the common setup:

### Step 1: Create a Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click the project dropdown → **New Project**
3. Name your project (e.g., "Snappier")
4. Click **Create**

### Step 2: Enable APIs

1. Go to **APIs & Services** → **Library**
2. Search for and enable the APIs you need:
   - Gmail API
   - Google Docs API
   - Google Sheets API
   - Google Drive API
   - Google Calendar API

### Step 3: Configure OAuth Consent Screen

1. Go to **APIs & Services** → **OAuth consent screen**
2. Choose **External** (or Internal for Google Workspace)
3. Fill in app information:
   - App name: `Snappier`
   - User support email: Your email
   - Developer contact: Your email
4. Add scopes for each service (see individual guides)
5. Add test users (while in testing mode)
6. Save and continue

### Step 4: Create OAuth Credentials

1. Go to **APIs & Services** → **Credentials**
2. Click **Create Credentials** → **OAuth client ID**
3. Application type: **Web application**
4. Name: `Snappier Web Client`
5. Add **Authorized redirect URIs**:
   - For Gmail: `http://localhost:3000/api/integrations/gmail/callback`
   - For Google Docs: `http://localhost:3000/api/integrations/google-docs/callback`
   - For Google Sheets: `http://localhost:3000/api/integrations/google-sheets/callback`
   - For Google Drive: `http://localhost:3000/api/integrations/google-drive/callback`
   - For Google Calendar: `http://localhost:3000/api/integrations/google-calendar/callback`
6. Click **Create**
7. Copy the **Client ID** and **Client Secret**

## Environment Variables Pattern

Each Google integration uses this pattern:

```env
GOOGLE_{SERVICE}_CLIENT_ID="your-client-id"
GOOGLE_{SERVICE}_CLIENT_SECRET="your-client-secret"
GOOGLE_{SERVICE}_REDIRECT_URL="http://localhost:3000/api/integrations/{service}/callback"
```

## OAuth Flow

```
User clicks Connect
       ↓
/api/integrations/google-{service}/connect
       ↓
Redirect to Google OAuth consent screen
       ↓
User grants permissions
       ↓
/api/integrations/google-{service}/callback
       ↓
Access + Refresh tokens stored (encrypted)
       ↓
Credential available in workflow nodes
```

## Token Management

- **Access Token Expiry:** 1 hour
- **Refresh Token:** Stored for automatic refresh
- **Auto-refresh:** Implemented with 5-minute buffer before expiry
