import { requireAuth } from "@/lib/auth-utils";
import { HydrateClient } from "@/trpc/server";
import { Suspense } from "react";
import { ErrorBoundary } from "react-error-boundary";
import { 
  ReferralsDashboard, 
  ReferralsLoading, 
  ReferralsError 
} from "@/features/referrals/components/referrals-dashboard";

export const metadata = {
  title: "Referrals - ChattoFlow",
  description: "Earn money by referring friends to ChattoFlow",
};

export default async function ReferralsPage() {
  await requireAuth();

  return (
    <div className="container mx-auto py-6 px-4 max-w-6xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Referral Program</h1>
        <p className="text-muted-foreground">
          Earn 10% commission for every user you refer who subscribes
        </p>
      </div>

      <HydrateClient>
        <ErrorBoundary fallback={<ReferralsError />}>
          <Suspense fallback={<ReferralsLoading />}>
            <ReferralsDashboard />
          </Suspense>
        </ErrorBoundary>
      </HydrateClient>
    </div>
  );
}

