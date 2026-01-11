import { requireAuth } from "@/lib/auth-utils";
import { HydrateClient } from "@/trpc/server";
import { Suspense } from "react";
import { ErrorBoundary } from "react-error-boundary";
import { 
  ReferralsDashboard, 
  ReferralsLoading, 
  ReferralsError 
} from "@/features/referrals/components/referrals-dashboard";
import { Gift, Sparkles } from "lucide-react";

export const metadata = {
  title: "Referrals - Snappier",
  description: "Earn money by referring friends to Snappier",
};

export default async function ReferralsPage() {
  await requireAuth();

  return (
    <div className="p-6 md:px-8 md:py-8 lg:px-12 lg:py-10 h-full">
      <div className="mx-auto max-w-6xl w-full">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-primary/10">
              <Gift className="size-5 text-primary" />
            </div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Referral Program</h1>
          </div>
          <p className="text-muted-foreground text-sm md:text-base">
            Invite friends and earn <span className="text-primary font-semibold">10% commission</span> for every subscription
          </p>
        </div>

        {/* How it Works */}
        <div className="grid gap-4 md:grid-cols-3 mb-8">
          {[
            { step: "1", title: "Share your link", description: "Copy your unique referral link and share it with friends" },
            { step: "2", title: "Friends sign up", description: "When they create an account using your link" },
            { step: "3", title: "Earn rewards", description: "Get 10% of their subscription as commission" },
          ].map((item) => (
            <div key={item.step} className="relative p-5 rounded-xl border border-border/50 bg-card/50 hover:bg-card transition-colors">
              <div className="flex items-center gap-3 mb-3">
                <div className="flex items-center justify-center size-8 rounded-full bg-primary/10 text-primary font-bold text-sm">
                  {item.step}
                </div>
                <h3 className="font-semibold">{item.title}</h3>
              </div>
              <p className="text-sm text-muted-foreground">{item.description}</p>
            </div>
          ))}
        </div>

        <HydrateClient>
          <ErrorBoundary fallback={<ReferralsError />}>
            <Suspense fallback={<ReferralsLoading />}>
              <ReferralsDashboard />
            </Suspense>
          </ErrorBoundary>
        </HydrateClient>
      </div>
    </div>
  );
}

