# Deployment Documentation

This section covers deploying Snappier to production.

## Platforms

- [Vercel Deployment](#vercel-deployment)
- [Environment Variables](#environment-variables)

## Vercel Deployment

### Prerequisites
- Vercel account
- GitHub repository connected
- Database (Neon, PlanetScale, or similar)
- Inngest account

### Steps

1. **Import Project**
   - Go to [vercel.com](https://vercel.com)
   - Click "New Project"
   - Import from GitHub

2. **Configure Build**
   - Framework Preset: Next.js
   - Build Command: `npm run build`
   - Output Directory: `.next`

3. **Set Environment Variables**
   - Add all required variables (see below)

4. **Deploy**
   - Click Deploy
   - Wait for build to complete

## Environment Variables

### Required

```env
# Database
DATABASE_URL="postgresql://..."

# Authentication
BETTER_AUTH_SECRET="random-secret-string"
BETTER_AUTH_URL="https://your-domain.com"

# Inngest
INNGEST_EVENT_KEY="your-event-key"
INNGEST_SIGNING_KEY="your-signing-key"
```

### Integration-Specific

Each integration has its own environment variables. See the individual integration docs:

- [AI Integrations](../integrations/ai/README.md)
- [Google Integrations](../integrations/google/README.md)
- [Social Integrations](../integrations/social/README.md)
- [Productivity Integrations](../integrations/productivity/README.md)
- [Communication Integrations](../integrations/communication/README.md)

### Production URLs

When deploying, update all redirect URLs from `localhost:3000` to your production domain:

```env
GOOGLE_DOCS_REDIRECT_URL="https://your-domain.com/api/integrations/google-docs/callback"
# ... repeat for all OAuth integrations
```

## Post-Deployment

1. **Run Migrations**
   ```bash
   npx prisma migrate deploy
   ```

2. **Verify Inngest**
   - Check Inngest dashboard for connected app

3. **Test OAuth Flows**
   - Add production URLs to OAuth apps
   - Test each integration connection

4. **Monitor**
   - Check Vercel logs
   - Monitor Inngest function executions
