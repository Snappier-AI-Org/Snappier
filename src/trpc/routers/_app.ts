import { credentialsRouter } from '@/features/credentials/server/routers';
import { createTRPCRouter } from '../init';
import { workflowsRouter } from '@/features/workflows/server/routers';
import { executionsRouter } from '@/features/executions/server/routers';
import { templatesRouter } from '@/features/templates/server/routers';
import { chatRouter } from '@/features/chat/server/routers';
import { referralsRouter } from '@/features/referrals/server/routers';
import { earningsRouter } from '@/features/earnings/server/routers';

export const appRouter = createTRPCRouter({
  workflows: workflowsRouter,
  credentials: credentialsRouter,
  executions: executionsRouter,
  templates: templatesRouter,
  chat: chatRouter,
  referrals: referralsRouter,
  earnings: earningsRouter,
});
// export type definition of API
export type AppRouter = typeof appRouter;