# Todoist Integration

> **Last Updated:** 2026-01-08  
> **Status:** ✅ Active

## Overview

Todoist is a popular task management application that helps users organize tasks, projects, and collaborate with others. This integration allows you to automate task creation, updates, project management, and more through your workflows.

## External Setup

### Prerequisites
- [ ] Free or Premium Todoist account at [todoist.com](https://todoist.com)
- [ ] Developer account at [Todoist Developer](https://developer.todoist.com/)

### Step 1: Create a Todoist App

1. Go to the [Todoist App Management Console](https://developer.todoist.com/appconsole.html)
2. Click **"Create a new app"**
3. Fill in the application details:
   - **App Name:** `Nodebase` (or your preferred name)
   - **App Service URL:** Your application URL (e.g., `https://your-domain.com`)
   - **OAuth Redirect URL:** 
     - Development: `http://localhost:3000/api/integrations/todoist/callback`
     - Production: `https://your-domain.com/api/integrations/todoist/callback`

> ⚠️ **Important:** Make sure the redirect URL matches exactly what you configure in your environment variables.

### Step 2: Get Your Credentials

After creating the app, you'll see:
- **Client ID** - A unique identifier for your app
- **Client Secret** - Keep this secure, never expose it publicly

Copy these values - you'll need them for your environment variables.

### Step 3: Configure OAuth Scopes

Todoist OAuth uses the following scopes (automatically requested during connection):
- `data:read_write` - Full access to read and write tasks, projects, labels, etc.
- `data:delete` - Permission to delete tasks and projects

## Environment Variables

Add these to your `.env` file:

```env
# Required
TODOIST_CLIENT_ID="your-client-id-from-todoist"
TODOIST_CLIENT_SECRET="your-client-secret-from-todoist"
TODOIST_REDIRECT_URL="http://localhost:3000/api/integrations/todoist/callback"
```

| Variable | Required | Description |
|----------|----------|-------------|
| `TODOIST_CLIENT_ID` | Yes | OAuth Client ID from Todoist App Console |
| `TODOIST_CLIENT_SECRET` | Yes | OAuth Client Secret from Todoist App Console |
| `TODOIST_REDIRECT_URL` | Yes | Must match the redirect URL configured in Todoist App Console |

## Codebase Files

| File | Purpose |
|------|---------|
| `src/app/api/integrations/todoist/connect/route.ts` | OAuth initiation endpoint |
| `src/app/api/integrations/todoist/callback/route.ts` | OAuth callback handler |
| `src/app/api/integrations/todoist/disconnect/route.ts` | Disconnect/revoke access |
| `src/features/executions/components/todoist/executor.ts` | Node execution logic |
| `src/features/executions/components/todoist/dialog.tsx` | Node configuration UI |
| `src/features/executions/components/todoist/node.tsx` | Workflow node component |
| `src/features/executions/components/todoist/actions.ts` | Server actions for realtime tokens |
| `src/inngest/channels/todoist.ts` | Realtime execution updates |
| `prisma/schema.prisma` | NodeType enum includes `TODOIST` |

## Operations Supported

### Task Operations

| Operation | Description | Required Fields | Optional Fields |
|-----------|-------------|-----------------|-----------------|
| `createTask` | Create a new task | `content` | `description`, `projectId`, `dueString`, `priority`, `labels` |
| `getTask` | Get a single task | `taskId` | - |
| `updateTask` | Update an existing task | `taskId` | `content`, `description`, `dueString`, `priority`, `labels` |
| `closeTask` | Mark task as complete | `taskId` | - |
| `reopenTask` | Reopen a closed task | `taskId` | - |
| `deleteTask` | Delete a task | `taskId` | - |
| `getActiveTasks` | Get all active tasks | - | `projectId`, `filter` |

### Project Operations

| Operation | Description | Required Fields | Optional Fields |
|-----------|-------------|-----------------|-----------------|
| `createProject` | Create a new project | `projectName` | `projectColor` |
| `getProject` | Get a single project | `projectId` | - |
| `getProjects` | Get all projects | - | - |
| `deleteProject` | Delete a project | `projectId` | - |

### Comment & Label Operations

| Operation | Description | Required Fields | Optional Fields |
|-----------|-------------|-----------------|-----------------|
| `createComment` | Add a comment to a task | `taskId`, `commentContent` | - |
| `getComments` | Get all comments on a task | `taskId` | - |
| `createLabel` | Create a new label | `labelName` | `labelColor` |
| `getLabels` | Get all labels | - | - |

## Credential Flow

```
1. User navigates to Credentials page
2. Clicks "New Credential" → Selects "Todoist"
3. Redirected to Todoist OAuth consent screen
4. User grants permissions
5. Callback stores access token in encrypted Credential record
6. Credential available in workflow node selector
```

## Token Management

- **Access Token Expiry:** Never (Todoist access tokens don't expire)
- **Refresh Token:** Not needed (tokens are permanent until revoked)
- **Token Storage:** Encrypted in `Credential.value` field

## Workflow Usage

### Adding the Node
1. Open workflow editor
2. Click **+** or drag from node palette
3. Select **"Todoist"** from the Productivity section
4. Connect to previous nodes

### Configuration
1. **Variable Name:** Name to access output (e.g., `myTodoist`)
2. **Credential:** Select your connected Todoist account
3. **Operation:** Choose the action to perform
4. **Operation-specific fields:** Fill in required/optional fields based on operation

### Example: Create Task from Trigger Data

```handlebars
Content: {{googleForm.responses['Task Name']}}
Description: Created from workflow
Due String: tomorrow at 5pm
Priority: 1
```

### Accessing Output

```handlebars
# For createTask/getTask:
{{myTodoist.id}}
{{myTodoist.content}}
{{myTodoist.url}}

# For getActiveTasks:
{{myTodoist.tasks}}
{{myTodoist.count}}

# For getProjects:
{{myTodoist.projects}}

# Full JSON output:
{{json myTodoist}}
```

## Priority Values

Todoist uses numbers 1-4 for priority:
- **1** = Priority 1 (Urgent/Red)
- **2** = Priority 2 (High/Orange)
- **3** = Priority 3 (Medium/Yellow)
- **4** = Priority 4 (Low/No color)

## Due Date Formats

Todoist supports natural language due dates:
- `today`, `tomorrow`, `yesterday`
- `next Monday`, `Friday at 3pm`
- `in 3 days`, `in 2 weeks`
- `Jan 20`, `2026-01-20`
- `every day`, `every Monday at 9am`

## Troubleshooting

### Common Issues

#### Issue: "Todoist credential not found"
**Cause:** The credential was deleted or the connection was lost  
**Solution:** 
1. Go to Credentials page
2. Create a new Todoist credential
3. Update your workflow node to use the new credential

#### Issue: "Invalid Todoist credentials"
**Cause:** Access token was revoked from Todoist settings  
**Solution:** 
1. Delete the existing credential
2. Create a new credential and re-authenticate

#### Issue: "Permission denied" or 403 error
**Cause:** Trying to access a resource you don't have permission for  
**Solution:** 
1. Verify the task/project ID is correct
2. Ensure you have access to that resource in Todoist
3. Check if you're trying to modify a shared project without edit permission

#### Issue: "Task ID is required"
**Cause:** Operation requires a task ID but none was provided  
**Solution:** 
1. Use a previous Todoist node to get/create a task first
2. Reference the task ID: `{{previousTodoist.id}}`

### Debug Tips
- Check browser console for frontend errors
- Check server logs for API errors
- Verify environment variables are set correctly
- Test with a fresh credential if issues persist
- Use the "Get Task" operation to verify task IDs are valid

## Changelog

| Date | Change |
|------|--------|
| 2026-01-08 | Initial Todoist integration release |

## Related Documentation

- [Todoist REST API Documentation](https://developer.todoist.com/rest/v2/)
- [Todoist OAuth Documentation](https://developer.todoist.com/guides/#oauth)
- [Todoist Filter Syntax](https://todoist.com/help/articles/introduction-to-filters)
- [Nodebase Architecture](../architecture/README.md)
