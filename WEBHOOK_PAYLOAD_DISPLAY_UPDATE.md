# Webhook Payload Display Update

## Summary
Updated the "Listen for Test Event" feature in the Webhook Trigger to display the complete webhook payload structure, similar to N8N's webhook testing interface.

## Changes Made

### 1. Enhanced Payload Display
**File:** `src/features/triggers/components/webhook-trigger/dialog.tsx`

**Before:**
- Only showed partial webhook data
- Small display area (max-h-48)
- No copy functionality
- Basic JSON display

**After:**
- Shows complete webhook payload structure
- Larger display area (max-h-96) for better visibility
- Includes copy button to quickly copy payload
- Professional header with "Complete Webhook Payload" label
- Helper text showing variable usage examples

### 2. Improved Data Parsing

**Previous Logic:**
```typescript
const webhookData = data.execution.output?.webhook;
if (webhookData) {
  setLastReceivedEvent(webhookData);
} else {
  // Show minimal info
}
```

**New Logic:**
```typescript
let completePayload: any = {};

try {
  const output = typeof data.execution.output === 'string' 
    ? JSON.parse(data.execution.output) 
    : data.execution.output;
  
  // Build complete structure
  completePayload = {
    webhook: output?.webhook || output || {},
    executionData: {
      executionId: data.execution.id,
      status: data.execution.status,
      startedAt: data.execution.startedAt,
      finishedAt: data.execution.finishedAt,
    }
  };
} catch (e) {
  // Fallback with helpful tips
}

setLastReceivedEvent(completePayload);
```

### 3. Display Structure

The payload now shows in a structured format similar to your example:

```json
{
  "webhook": {
    "params": { ... },
    "query": { ... },
    "body": {
      "event_name": "message.text.received",
      "message": {
        "date": 1756282585304,
        "chat": {
          "chat_type": "PRIVATE",
          "id": "7562ac498f7d1269e"
        },
        "from": {
          "id": "7562ac498f7d1269e",
          "is_bot": false,
          "display_name": "Vu Duc Hung"
        },
        "text": "xin chào em"
      }
    },
    "headers": {
      "connection": "upgrade",
      "host": "n8n.vutuchung.com",
      "content-length": "275",
      "content-type": "application/json",
      "user-agent": "Java/1.8.0.392"
    }
  },
  "executionData": {
    "executionId": "...",
    "status": "completed",
    "startedAt": "...",
    "finishedAt": "..."
  }
}
```

### 4. UI Improvements

**Display Features:**
- ✅ Professional bordered container with header
- ✅ Syntax-highlighted JSON (via `<pre>` and `font-mono`)
- ✅ Copy button to quickly copy entire payload
- ✅ Scrollable content (max-height: 96 = 384px)
- ✅ Helper text showing how to use the data in workflow
- ✅ Success indicator with green checkmark

**Layout:**
```tsx
<div className="space-y-2">
  {/* Header with copy button */}
  <div className="flex items-center justify-between">
    <div className="flex items-center gap-2 text-sm text-green-600">
      <CheckCircle2 /> Event Received!
    </div>
    <Button onClick={copyToClipboard}>
      <CopyIcon /> Copy
    </Button>
  </div>
  
  {/* Payload display */}
  <div className="rounded-md border bg-muted/50">
    <div className="bg-muted px-3 py-2 border-b">
      <span className="text-xs font-mono">Complete Webhook Payload</span>
    </div>
    <pre className="p-3 text-xs font-mono max-h-96 overflow-y-auto">
      {JSON.stringify(lastReceivedEvent, null, 2)}
    </pre>
  </div>
  
  {/* Helper text */}
  <p className="text-xs text-muted-foreground">
    Access data using: {{webhook.payload}}, {{webhook.headers}}, {{webhook.query}}
  </p>
</div>
```

## User Experience

### Testing Flow

1. **Click "Listen for Test Event"**
   - Button changes to "Stop Listening" with loading spinner
   - Toast notification appears
   - Polling starts (every 2 seconds)

2. **Send Webhook Request**
   - Use cURL, Postman, or your app (Zalo Bot, Discord, etc.)
   - Send to the displayed webhook URL

3. **View Complete Payload**
   - Green checkmark with "Event Received!" message
   - Complete JSON payload displayed in bordered container
   - Copy button available for quick copying
   - Helper text shows variable usage

### Example Display

When you test a Zalo Bot webhook, you'll see:

```
✓ Event Received!                                    [Copy]

┌─ Complete Webhook Payload ────────────────────────────┐
│ {                                                      │
│   "webhook": {                                         │
│     "body": {                                          │
│       "event_name": "message.text.received",           │
│       "message": {                                     │
│         "date": 1756282585304,                         │
│         "chat": {                                      │
│           "chat_type": "PRIVATE",                      │
│           "id": "7562ac498f7d1269e"                    │
│         },                                             │
│         "from": {                                      │
│           "id": "7562ac498f7d1269e",                   │
│           "display_name": "Vu Duc Hung"                │
│         },                                             │
│         "text": "xin chào em"                          │
│       }                                                │
│     },                                                 │
│     "headers": {                                       │
│       "content-type": "application/json"               │
│     }                                                  │
│   },                                                   │
│   "executionData": {                                   │
│     "executionId": "abc123",                           │
│     "status": "completed"                              │
│   }                                                    │
│ }                                                      │
└────────────────────────────────────────────────────────┘

Access data in your workflow using: {{webhook.payload}}, 
{{webhook.headers}}, {{webhook.query}}, etc.
```

## Variable Access Examples

Based on the displayed payload, you can now access:

| Variable | Example Value | Usage |
|----------|--------------|-------|
| `{{webhook.body.message.text}}` | "xin chào em" | Get message text |
| `{{webhook.body.message.from.id}}` | "7562ac498f7d1269e" | Get sender ID |
| `{{webhook.body.message.from.display_name}}` | "Vu Duc Hung" | Get sender name |
| `{{webhook.body.message.chat.id}}` | "7562ac498f7d1269e" | Get chat ID |
| `{{webhook.body.event_name}}` | "message.text.received" | Get event type |
| `{{webhook.headers.content-type}}` | "application/json" | Get content type |

## Benefits

1. **Complete Visibility**: See the entire webhook payload structure
2. **Easy Debugging**: Quickly identify available data fields
3. **Quick Reference**: Copy payload for documentation or debugging
4. **Better UX**: Professional display similar to N8N and other automation tools
5. **Helper Text**: Know exactly how to access the data in your workflow

## Testing

To test the new display:

1. Open any workflow with a Webhook Trigger
2. Click "Listen for Test Event"
3. Send a webhook request (e.g., from Zalo Bot, Discord, etc.)
4. Observe the complete payload display
5. Try copying the payload using the Copy button
6. Use the displayed data structure to configure downstream nodes

## Date Applied
January 9, 2026
