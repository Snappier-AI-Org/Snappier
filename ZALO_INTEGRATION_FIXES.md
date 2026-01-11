# Zalo Integration Fixes - Applied

## Summary
Fixed the Zalo Bot integration to properly authenticate with Zalo API and provide better error messages.

## Changes Made

### 1. Fixed Authentication Method
**File:** `src/features/executions/components/zalo/executor.ts`

**Problem:** 
- Was sending `access_token` as a header
- Zalo API requires it as a query parameter

**Solution:**
```typescript
// Before:
const apiUrl = "https://openapi.zalo.me/v2.0/oa/message";
headers: { access_token: data.accessToken! }

// After:
const baseUrl = "https://openapi.zalo.me/v3.0/oa/message/cs";
const apiUrl = `${baseUrl}?access_token=${encodeURIComponent(data.accessToken!)}`;
headers: { "Content-Type": "application/json" }
```

### 2. Updated API Version
- Changed from `/v2.0/oa/message` to `/v3.0/oa/message/cs`
- CS endpoint is for Customer Service messages (bot to user)

### 3. Improved Error Messages
Added specific error handling for common Zalo API errors:

| Error Code | Old Message | New Message |
|------------|-------------|-------------|
| -124 | Generic API error | "Access token is invalid or expired. Please get a new Bot Token from developers.zalo.me..." |
| -201 | Generic API error | "Invalid recipient ID. The user must have sent a message to your bot first..." |
| -213 | Generic API error | "User has not interacted with your bot. The user must send at least one message..." |
| -216 | Generic API error | "Bot not found. Please verify your Bot Token is correct." |

### 4. Updated Dialog UI
**File:** `src/features/executions/components/zalo/dialog.tsx`

**Changes:**
- Changed label from "Access Token" to "Bot Token (Access Token)"
- Updated placeholder to show expected format: `1234567890:abcdef...`
- Added clear warning: "Use the long Bot Token, NOT the webhook Secret Token"
- Added link to developers.zalo.me
- Added note about token expiration and how to refresh

### 5. Removed parseError Dependency
**File:** `src/features/executions/components/zalo/executor.ts`

**Problem:**
- Was using `parseError()` which defaulted to "OpenAI node" messages
- Caused confusion when Zalo errors mentioned "OpenAI"

**Solution:**
- Removed import and usage of `parseError()`
- Created Zalo-specific error messages
- All errors now clearly say "Zalo Bot:" prefix

## Testing Instructions

### 1. Get Your Bot Token
1. Go to [developers.zalo.me](https://developers.zalo.me)
2. Select your bot
3. Go to "Thiết lập chung" (General Settings)
4. Find "Bot Token" section
5. Copy the token (format: `1234567890:abcdef...`)
   - If needed, click "Reset" to get a new one via Zalo message

### 2. Get Your Recipient ID
**Option A: From Webhook**
1. Set up a Webhook Trigger in your workflow
2. Send a message to your bot from Zalo app
3. Check webhook payload: `{{webhook.payload.sender.id}}`

**Option B: From Zalo Dashboard**
1. Go to developers.zalo.me → Your Bot
2. Check "Interactions" or "Users" section

### 3. Configure Zalo Bot Node
```
Variable Name: ZaloBot
Bot Token: 1234567890:abcdef... (your long token)
Recipient ID: 8851495596870002259 (or {{webhook.payload.sender.id}})
Message: Hello from ChatToFlow!
```

### 4. Test the Workflow
1. Save the workflow
2. Run it
3. Check your Zalo app for the message

## Common Issues & Solutions

### Issue: "Access token is invalid"
**Cause:** Using the wrong token
**Solution:** Use the Bot Token (long format: `1234567890:abc...`), NOT the Secret Token (`abc-xyz-123`)

### Issue: "User has not interacted with your bot"
**Cause:** Trying to message a user who hasn't messaged the bot first
**Solution:** Send a message to your bot from Zalo app first, then retry

### Issue: "Invalid recipient ID"
**Cause:** Wrong recipient ID format or user doesn't exist
**Solution:** Get the correct ID from webhook payload or bot dashboard

## Token Types Clarification

### Bot Token (Access Token) ✅
- **Format:** `1234567890:abcdefghijklmnopqrstuvwxyz...` (long)
- **Used for:** Sending messages via API
- **Location:** developers.zalo.me → Bot → Settings → Bot Token
- **Use in:** Zalo Bot node's "Bot Token" field

### Secret Token (Webhook Secret) ❌
- **Format:** `abc-xyz-123` (short, user-defined)
- **Used for:** Verifying webhook requests (optional security)
- **Location:** developers.zalo.me → Bot → Settings → Webhook → Secret Token
- **Use in:** NOT used in the Zalo Bot node!

## API Endpoint Reference

### Send Message (CS - Customer Service)
```
POST https://openapi.zalo.me/v3.0/oa/message/cs?access_token={TOKEN}
Content-Type: application/json

{
  "recipient": {
    "user_id": "8851495596870002259"
  },
  "message": {
    "text": "Hello from ChatToFlow!"
  }
}
```

### Response Format
```json
{
  "error": 0,
  "message": "Success",
  "data": {
    "message_id": "abc123def456"
  }
}
```

## Files Modified

1. `src/features/executions/components/zalo/executor.ts`
   - Updated authentication method
   - Improved error handling
   - Added specific error messages
   - Removed parseError dependency

2. `src/features/executions/components/zalo/dialog.tsx`
   - Updated token field label and description
   - Added helpful warnings
   - Added link to Zalo developer portal
   - Clarified token types

## Date Applied
January 9, 2026
