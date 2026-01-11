# Getting Started

This section covers setting up Snappier for local development.

## Prerequisites

- Node.js 18+
- pnpm (recommended) or npm
- PostgreSQL database (local or hosted)

## Quick Start

### 1. Clone and Install

```bash
git clone https://github.com/Vanjems/snappier.git
cd snappier
pnpm install
```

### 2. Set Up Environment

```bash
cp .env.example .env
```

Edit `.env` with your configuration (see [Environment Variables](../deployment/README.md#environment-variables)).

### 3. Set Up Database

```bash
npx prisma migrate dev
```

### 4. Start Development Server

```bash
pnpm dev:all
```

This starts:
- Next.js development server
- Inngest dev server

### 5. Open the App

Navigate to [http://localhost:3000](http://localhost:3000)

## Project Structure

```
snappier/
├── docs/              # Documentation (you are here)
├── prisma/            # Database schema and migrations
├── public/            # Static assets
├── scripts/           # Utility scripts
├── src/
│   ├── app/          # Next.js App Router
│   ├── components/   # Shared UI components
│   ├── features/     # Feature modules
│   ├── hooks/        # React hooks
│   ├── inngest/      # Background job functions
│   ├── lib/          # Utilities and helpers
│   └── trpc/         # tRPC API router
└── package.json
```

## Next Steps

1. [Set up integrations](../integrations/README.md)
2. [Understand the architecture](../architecture/README.md)
3. [Deploy to production](../deployment/README.md)
