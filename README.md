# Snappier - Workflow Automation Platform

A Zapier-like workflow automation platform built with Next.js that allows users to create, manage, and execute custom workflows with various triggers and actions.

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ installed
- PostgreSQL database (NeonDB recommended)
- npm/yarn/pnpm/bun package manager
- Ngrok account (for webhook testing in development)
- Mprocs installed (optional, for easier development)

### Tech Stack

- **Framework**: Next.js 14+ (App Router)
- **Database**: NeonDB (PostgreSQL) via Prisma ORM
- **API Layer**: tRPC for type-safe APIs
- **Authentication**: Better Auth (supports GitHub, Google OAuth)
- **Workflow Engine**: Inngest
- **UI**: Shadcn/UI + React Flow (for workflow editor)
- **Subscriptions**: Polar
- **Monitoring**: Sentry
- **AI Integrations**: OpenAI, Anthropic (Claude), Google Gemini
- **Code Quality**: Biome (linting/formatting)
- **Deployment**: Vercel

## 📋 Installation

1. **Clone the repository**
```bash
git clone <repository-url>
cd snappier
```

2. **Install dependencies**
```bash
npm install
# or
yarn install
# or
pnpm install
```

3. **Set up environment variables**

Create a `.env` file in the root directory:

```env
# Database
DATABASE_URL="postgresql://..."  # Your NeonDB connection string

# Authentication
BETTER_AUTH_SECRET="your-secret-key"
BETTER_AUTH_URL="http://localhost:3000"

# OAuth Providers
GITHUB_CLIENT_ID="your-github-client-id"
GITHUB_CLIENT_SECRET="your-github-client-secret"
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"

# AI Services
OPENAI_API_KEY="sk-..."
ANTHROPIC_API_KEY="sk-ant-..."
GOOGLE_GENERATIVE_AI_API_KEY="..."

# Polar (Subscriptions)
POLAR_ACCESS_TOKEN="..."
POLAR_ORGANIZATION_ID="..."

# Inngest
INNGEST_EVENT_KEY="..."
INNGEST_SIGNING_KEY="..."

# Sentry (Error Monitoring)
SENTRY_DSN="https://..."
SENTRY_AUTH_TOKEN="..."

# Ngrok (for local webhook testing - see below)
NGROK_AUTHTOKEN="your-ngrok-token"
```

4. **Set up the database**

```bash
# Generate Prisma client
npx prisma generate

# Run migrations
npx prisma migrate dev

# (Optional) Seed the database
npx prisma db seed
```

## 🏃 Running the Application

### Option 1: Using Mprocs (Recommended for Development)

The project uses [mprocs.yaml](mprocs.yaml) to run multiple processes simultaneously:

```bash
npm run dev:all
```

This will start:
- Next.js development server (port 3000)
- Inngest Dev Server (for workflow execution)

**Note**: Ngrok is NOT automatically started by mprocs. See "Webhook Setup" below.

**Ngrok (when testing webhooks):**
```bash
npm run ngrok:dev
```


### Option 2: Manual Setup

Run each service in separate terminal windows:

**Terminal 1 - Next.js:**
```bash
npm run dev
```

**Terminal 2 - Inngest Dev Server:**
```bash
npx inngest-cli@latest dev
```

**Terminal 3 - Ngrok (when testing webhooks):**
```bash
npm run ngrok:dev
```

## 🔗 Webhook Setup for Local Development

### Why Ngrok is Needed

External services (Stripe, Google Forms) need to send webhooks to your local machine. Ngrok creates a public URL that tunnels to your localhost.

### Setup Steps

1. **Install Ngrok**
```bash
npm install -g ngrok
# or download from https://ngrok.com/download
```

2. **Authenticate Ngrok**
```bash
ngrok authtoken YOUR_NGROK_AUTH_TOKEN
```

3. **Start Ngrok** (in a separate terminal)
```bash
npm run ngrok:dev
```

4. **Copy the forwarding URL**
```
Forwarding: https://abc123.ngrok-free.app -> http://localhost:3000
```

5. **Configure Webhooks**

Update your webhook URLs in external services:

- **Stripe**: `https://abc123.ngrok-free.app/api/webhooks/stripe?workflowId=YOUR_WORKFLOW_ID`
- **Google Forms**: `https://abc123.ngrok-free.app/api/webhooks/google-form?workflowId=YOUR_WORKFLOW_ID`

### Available Webhook Endpoints

| Service | Endpoint | Query Params |
|---------|----------|--------------|
| Stripe | `/api/webhooks/stripe` | `workflowId` (required) |
| Google Forms | `/api/webhooks/google-form` | `workflowId` (required) |

## 🎯 Features

### Workflow Components

**Triggers:**
- Manual Trigger - Execute workflow via button click
- Google Forms - Trigger on form submission
- Stripe Events - Trigger on Stripe webhooks

**Actions:**
- HTTP Request - Make API calls (GET, POST, PUT, PATCH, DELETE)
- OpenAI - Generate text using GPT models
- Anthropic - Generate text using Claude
- Google Gemini - Generate text using Gemini
- Discord - Send messages to Discord webhooks
- Slack - Send messages to Slack webhooks

### Authentication

The app uses Better Auth with support for:
- GitHub OAuth
- Google OAuth
- Email/Password (if configured)

### Subscription Management

Premium features are gated behind Polar subscriptions. Check [`src/trpc/init.ts`](src/trpc/init.ts) for the `premiumProcedure`.

## 🗂️ Project Structure

```
snappier/
├── prisma/              # Database schema and migrations
├── public/              # Static assets
├── src/
│   ├── app/            # Next.js App Router pages
│   │   ├── (auth)/     # Auth pages (login, signup)
│   │   ├── (dashboard)/ # Protected dashboard pages
│   │   └── api/        # API routes (tRPC, webhooks, etc.)
│   ├── components/     # Reusable UI components
│   ├── config/         # Configuration files
│   ├── features/       # Feature modules
│   │   ├── auth/       # Authentication
│   │   ├── credentials/ # API credential management
│   │   ├── editor/     # Workflow editor
│   │   ├── executions/ # Workflow execution history
│   │   ├── subscriptions/ # Subscription management
│   │   ├── triggers/   # Trigger components
│   │   └── workflows/  # Workflow CRUD operations
│   ├── inngest/        # Inngest workflow functions
│   │   ├── channels/   # Real-time status channels
│   │   └── functions.ts # Workflow execution logic
│   ├── lib/            # Utility functions
│   └── trpc/           # tRPC setup and routers
├── .env                # Environment variables (not in git)
├── mprocs.yaml         # Multi-process configuration
└── package.json        # Dependencies
```

## 🔧 Configuration Files

- [`next.config.ts`](next.config.ts) - Next.js + Sentry configuration
- [`biome.json`](biome.json) - Code formatting/linting rules
- [`tsconfig.json`](tsconfig.json) - TypeScript configuration
- [`mprocs.yaml`](mprocs.yaml) - Development process manager
- [`prisma/schema.prisma`](prisma/schema.prisma) - Database schema

## � Documentation

Detailed documentation is available in the [`/docs`](./docs/) folder:

- **[Getting Started](./docs/getting-started/)** - Installation and setup
- **[Integrations](./docs/integrations/)** - Setup guides for all integrations
  - [AI Providers](./docs/integrations/ai/) - OpenAI, Anthropic, Gemini, Groq, Hugging Face
  - [Google Services](./docs/integrations/google/) - Gmail, Docs, Sheets, Drive, Calendar
  - [Social Media](./docs/integrations/social/) - Instagram, Telegram, WhatsApp
  - [Productivity](./docs/integrations/productivity/) - Notion, Trello, GitHub
  - [Communication](./docs/integrations/communication/) - Slack, Discord, Outlook
- **[Architecture](./docs/architecture/)** - System design and patterns
- **[Deployment](./docs/deployment/)** - Production deployment guides

When adding new integrations, use the [Integration Template](./docs/integrations/_TEMPLATE.md).

## �🚢 Deployment

### Vercel Deployment

1. **Connect your repository to Vercel**

2. **Add environment variables** in Vercel dashboard (all variables from `.env`)

3. **Configure build settings:**
   - Build Command: `npm run build` (or `prisma generate && next build`)
   - Output Directory: `.next`
   - Install Command: `npm install`

4. **Important: Production Webhooks**
   
   Update your webhook URLs in external services to use your production domain:
   ```
   https://your-domain.vercel.app/api/webhooks/stripe?workflowId=...
   https://your-domain.vercel.app/api/webhooks/google-form?workflowId=...
   ```

5. **Inngest Production Setup**
   - Deploy to Inngest Cloud or use Inngest's Vercel integration
   - Update `INNGEST_EVENT_KEY` and `INNGEST_SIGNING_KEY` with production values

### Environment-Specific Configuration

**Development:**
- Uses Ngrok for webhooks
- Inngest Dev Server runs locally
- No retries on workflow failures

**Production:**
- Direct webhook URLs to Vercel deployment
- Inngest Cloud handles workflow execution
- 3 retries on workflow failures (see [`src/inngest/functions.ts`](src/inngest/functions.ts))

## 🧪 Testing

### Testing Workflows

1. **Manual Trigger**: Click "Execute workflow" button in editor
2. **Webhook Triggers**: Send test webhooks using tools like:
   - Stripe CLI: `stripe trigger payment_intent.succeeded`
   - Postman/curl for Google Forms

### Monitoring Execution

- **Real-time Status**: Visual indicators on workflow nodes
- **Execution History**: Visit `/executions` page
- **Inngest Dashboard**: Monitor workflow runs at `http://localhost:8288` (dev)
- **Sentry**: Error tracking and performance monitoring

## 🐛 Troubleshooting

### Common Issues

**1. Database Connection Errors**
```bash
# Verify DATABASE_URL is correct
npx prisma db pull

# Regenerate Prisma client
npx prisma generate
```

**2. Inngest Not Receiving Events**
- Ensure Inngest dev server is running (`npx inngest-cli dev`)
- Check Inngest dashboard at `http://localhost:8288`
- Verify `INNGEST_EVENT_KEY` and `INNGEST_SIGNING_KEY` are set

**3. Webhooks Not Working Locally**
- Ensure Ngrok is running and forwarding to port 3000
- Update webhook URLs with current Ngrok URL (changes on restart)
- Check webhook payload in Ngrok inspector: `http://localhost:4040`

**4. Authentication Issues**
- Verify OAuth app credentials (GitHub/Google)
- Check `BETTER_AUTH_URL` matches your current URL
- Clear browser cookies and try again

**5. Production Deployment Not Working**
- ❌ Issue: Your deployed app at https://snappier-six.vercel.app/ is not loading
- **Checklist:**
  - ✅ Verify all environment variables are set in Vercel dashboard
  - ✅ Check build logs for errors
  - ✅ Ensure `DATABASE_URL` is accessible from Vercel
  - ✅ Run `prisma generate` in build command
  - ✅ Check Vercel function logs for runtime errors
  - ✅ Verify Sentry configuration is not blocking deployment

## 📚 Key Dependencies

| Package | Purpose |
|---------|---------|
| `next` | React framework |
| `@prisma/client` | Database ORM |
| `@trpc/server` | Type-safe APIs |
| `better-auth` | Authentication |
| `inngest` | Workflow orchestration |
| `@xyflow/react` | Workflow editor UI |
| `@polar-sh/sdk` | Subscription management |
| `@sentry/nextjs` | Error monitoring |
| `@ai-sdk/*` | AI model integrations |

## 📖 Additional Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [Prisma Documentation](https://www.prisma.io/docs)
- [tRPC Documentation](https://trpc.io/docs)
- [Inngest Documentation](https://www.inngest.com/docs)
- [Better Auth Documentation](https://www.better-auth.com/docs)
- [React Flow Documentation](https://reactflow.dev/)

## 🤝 For Your Senior Developer

### Getting Started Checklist

- [ ] Install dependencies: `npm install`
- [ ] Copy `.env.example` to `.env` and fill in values
- [ ] Run database migrations: `npx prisma migrate dev`
- [ ] Start development: `mprocs` (or manual setup)
- [ ] Access app at `http://localhost:3000`
- [ ] (Optional) Start Ngrok for webhook testing: `ngrok http 3000`

### Important Notes

- **Mprocs does NOT start Ngrok** - you need to run it separately when testing webhooks
- Workflow execution uses Inngest - make sure dev server is running
- Check [`src/inngest/functions.ts`](src/inngest/functions.ts) for execution logic
- Real-time status updates use Inngest Realtime channels (see [`src/inngest/channels/`](src/inngest/channels/))

### Architecture Overview

1. **User creates workflow** in React Flow editor ([`src/features/editor/`](src/features/editor/))
2. **Workflow saved** via tRPC ([`src/features/workflows/server/routers.ts`](src/features/workflows/server/routers.ts))
3. **Trigger event** sent to Inngest ([`src/inngest/client.ts`](src/inngest/client.ts))
4. **Inngest executes** workflow nodes in topological order ([`src/inngest/functions.ts`](src/inngest/functions.ts))
5. **Real-time updates** pushed to UI via Inngest channels ([`src/features/executions/hooks/use-node-status.ts`](src/features/executions/hooks/use-node-status.ts))

---

**Need Help?** Check the codebase or create an issue in the repository.
