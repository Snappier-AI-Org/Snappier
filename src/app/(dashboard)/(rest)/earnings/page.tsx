import { EarningsDashboard } from "@/features/earnings/components/earnings-dashboard";

export default function EarningsPage() {
  return (
    <div className="flex flex-col gap-6 p-6 max-w-6xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Earnings & Payouts</h1>
        <p className="text-muted-foreground mt-1">
          Manage your earnings from referrals and template sales
        </p>
      </div>
      <EarningsDashboard />
    </div>
  );
}

