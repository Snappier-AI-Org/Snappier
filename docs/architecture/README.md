# Architecture Documentation

This section covers the technical architecture of Nodebase.

## System Overview

Nodebase is a workflow automation platform built with:
- **Next.js 14+** - React framework with App Router
- **Prisma** - Database ORM
- **Inngest** - Background job processing
- **tRPC** - Type-safe API layer
- **React Flow** - Visual workflow editor

## Core Concepts

### Workflow Execution

```
Trigger Event (Webhook, Schedule, Manual)
           ↓
    Inngest Function
           ↓
    Workflow Executor
           ↓
    Node Executors (sequential)
           ↓
    Realtime Updates (Ably/Pusher)
           ↓
    Execution Complete
```

### Credential System

Credentials are stored encrypted in the database:

```
User creates credential
         ↓
API key/tokens encrypted
         ↓
Stored in Credential table
         ↓
Decrypted at execution time
         ↓
Used for API authentication
```

### Realtime Updates

Workflow execution status is broadcast in realtime:

```
Node starts executing
         ↓
Status pushed to channel
         ↓
Frontend receives update
         ↓
UI shows current node status
```

## Database Schema

Key tables:
- `Workflow` - Workflow definitions
- `Node` - Individual nodes in workflows
- `Edge` - Connections between nodes
- `Credential` - Encrypted API credentials
- `WorkflowExecution` - Execution history

## File Structure

```
src/
├── app/                    # Next.js App Router
│   ├── api/               # API routes
│   │   ├── integrations/  # OAuth endpoints
│   │   └── webhooks/      # Webhook handlers
│   └── (dashboard)/       # Dashboard pages
├── features/              # Feature modules
│   ├── executions/        # Node executors
│   ├── workflows/         # Workflow management
│   └── credentials/       # Credential management
├── inngest/               # Background jobs
│   ├── functions.ts       # Inngest functions
│   └── channels/          # Realtime channels
├── lib/                   # Shared utilities
└── trpc/                  # tRPC router
```

## Adding New Features

### New Node Type
1. Add to `NodeType` enum in Prisma schema
2. Create executor in `src/features/executions/components/`
3. Add channel in `src/inngest/channels/`
4. Register in workflow executor

### New Integration
1. Create OAuth routes in `src/app/api/integrations/`
2. Add credential type
3. Create node executor
4. Document in `/docs/integrations/`
