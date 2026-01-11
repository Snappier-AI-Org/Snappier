import { EarningsDashboard } from "@/features/earnings/components/earnings-dashboard";
import { Wallet } from "lucide-react";

export default function EarningsPage() {
  return (
    <div className="p-6 md:px-8 md:py-8 lg:px-12 lg:py-10 h-full">
      <div className="mx-auto max-w-6xl w-full">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-primary/10">
              <Wallet className="size-5 text-primary" />
            </div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Earnings & Payouts</h1>
          </div>
          <p className="text-muted-foreground text-sm md:text-base">
            Track and manage your earnings from referrals and template sales
          </p>
        </div>

        <EarningsDashboard />
      </div>
    </div>
  );
}

