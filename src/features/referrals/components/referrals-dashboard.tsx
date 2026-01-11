"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Copy, 
  RefreshCw, 
  Users, 
  MousePointerClick, 
  DollarSign, 
  TrendingUp,
  CheckCircle,
  Clock,
  Share2,
  Gift,
  ArrowRight,
  Wallet
} from "lucide-react";
import { toast } from "sonner";
import { useReferralStats, useRegenerateReferralCode } from "../hooks/use-referrals";
import Link from "next/link";

export function ReferralsDashboard() {
  const { data, isLoading, error } = useReferralStats();
  const regenerateMutation = useRegenerateReferralCode();

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Copied to clipboard!");
    } catch {
      toast.error("Failed to copy");
    }
  };

  const shareLink = async () => {
    if (!data?.referralCode) return;
    
    const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
    const referralLink = `${baseUrl}/?ref=${data.referralCode}`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Join ChattoFlow!",
          text: "Check out ChattoFlow - the best workflow automation platform!",
          url: referralLink,
        });
      } catch {
        copyToClipboard(referralLink);
      }
    } else {
      copyToClipboard(referralLink);
    }
  };

  if (isLoading) {
    return <ReferralsDashboardSkeleton />;
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <p className="text-red-500 mb-4">Failed to load referral data</p>
        <Button variant="outline" onClick={() => window.location.reload()}>
          Try Again
        </Button>
      </div>
    );
  }

  const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
  const referralLink = `${baseUrl}/?ref=${data?.referralCode}`;

  return (
    <div className="space-y-6">
      {/* Referral Link Card */}
      <Card className="bg-gradient-to-r from-[#0021F3] to-[#5C70EA] text-white border-0">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <Gift className="size-5" />
            Your Referral Link
          </CardTitle>
          <CardDescription className="text-blue-100">
            Share this link and earn 10% commission on every subscription!
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              value={referralLink}
              readOnly
              className="bg-white/20 border-white/30 text-white placeholder:text-white/70 font-mono text-sm"
            />
            <Button
              variant="secondary"
              size="icon"
              onClick={() => copyToClipboard(referralLink)}
              className="shrink-0"
            >
              <Copy className="size-4" />
            </Button>
            <Button
              variant="secondary"
              size="icon"
              onClick={shareLink}
              className="shrink-0"
            >
              <Share2 className="size-4" />
            </Button>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-sm">
              <span className="text-blue-100">Code: </span>
              <code className="bg-white/20 px-2 py-1 rounded font-mono">
                {data?.referralCode}
              </code>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => regenerateMutation.mutate()}
              disabled={regenerateMutation.isPending}
              className="text-white hover:bg-white/20"
            >
              <RefreshCw className={`size-4 mr-1 ${regenerateMutation.isPending ? 'animate-spin' : ''}`} />
              Regenerate
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Clicks"
          value={data?.stats.totalClicks || 0}
          description={`${data?.stats.uniqueClicks || 0} unique visitors`}
          icon={<MousePointerClick className="size-4 text-blue-500" />}
        />
        <StatCard
          title="Signups"
          value={data?.stats.totalSignups || 0}
          description="Users who registered"
          icon={<Users className="size-4 text-blue-400" />}
        />
        <StatCard
          title="Paid Conversions"
          value={data?.stats.totalPaidConversions || 0}
          description="Users who subscribed"
          icon={<CheckCircle className="size-4 text-purple-500" />}
        />
        <StatCard
          title="Total Earnings"
          value={`$${((data?.stats.totalEarnings || 0) / 100).toFixed(2)}`}
          description="Lifetime earnings"
          icon={<DollarSign className="size-4 text-[#5C70EA]" />}
          highlight
        />
      </div>

      {/* Earnings Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="size-5" />
            Earnings Breakdown
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="flex items-center gap-4 p-4 rounded-lg bg-yellow-50 dark:bg-yellow-950/30 border border-yellow-200 dark:border-yellow-800">
              <Clock className="size-8 text-yellow-600" />
              <div>
                <p className="text-sm text-yellow-800 dark:text-yellow-200 font-medium">Pending</p>
                <p className="text-2xl font-bold text-yellow-900 dark:text-yellow-100">
                  ${((data?.stats.pendingCommission || 0) / 100).toFixed(2)}
                </p>
                <p className="text-xs text-yellow-600 dark:text-yellow-400">
                  {data?.stats.pendingCount || 0} commission(s)
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4 p-4 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800">
              <CheckCircle className="size-8 text-blue-600" />
              <div>
                <p className="text-sm text-blue-800 dark:text-blue-200 font-medium">Approved</p>
                <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">
                  ${((data?.stats.approvedCommission || 0) / 100).toFixed(2)}
                </p>
                <p className="text-xs text-blue-600 dark:text-blue-400">
                  {data?.stats.approvedCount || 0} commission(s)
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4 p-4 rounded-lg bg-[#0021F3]/10 dark:bg-[#0021F3]/20 border border-[#0021F3]/20 dark:border-[#0021F3]/30">
              <DollarSign className="size-8 text-[#0021F3]" />
              <div>
                <p className="text-sm text-[#0021F3] dark:text-blue-200 font-medium">Paid Out</p>
                <p className="text-2xl font-bold text-[#05014A] dark:text-blue-100">
                  ${((data?.stats.paidCommission || 0) / 100).toFixed(2)}
                </p>
                <p className="text-xs text-[#5C70EA] dark:text-blue-400">
                  {data?.stats.paidCount || 0} commission(s)
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Withdraw CTA */}
      {(data?.stats.approvedCommission || 0) >= 1000 && (
        <Card className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 border-purple-500/20">
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-full bg-purple-100 dark:bg-purple-900">
                  <Wallet className="size-6 text-purple-600 dark:text-purple-300" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg">
                    You have ${((data?.stats.approvedCommission || 0) / 100).toFixed(2)} ready to withdraw!
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Request a payout to your PayPal, bank account, or crypto wallet.
                  </p>
                </div>
              </div>
              <Button asChild>
                <Link href="/earnings">
                  Withdraw Now <ArrowRight className="ml-2 size-4" />
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Activity */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Clicks */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Recent Clicks</CardTitle>
            <CardDescription>Last 7 days</CardDescription>
          </CardHeader>
          <CardContent>
            {data?.recentClicks && data.recentClicks.length > 0 ? (
              <div className="space-y-3">
                {data.recentClicks.map((click) => (
                  <div
                    key={click.id}
                    className="flex items-center justify-between py-2 border-b last:border-0"
                  >
                    <div className="flex items-center gap-3">
                      <MousePointerClick className="size-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm">
                          {new Date(click.createdAt).toLocaleDateString()}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {click.userAgent?.slice(0, 50) || "Unknown device"}...
                        </p>
                      </div>
                    </div>
                    {click.convertedToSignup && (
                      <Badge variant="secondary" className="bg-[#0021F3]/10 text-[#0021F3] dark:bg-[#5C70EA]/20 dark:text-[#5C70EA]">
                        Converted
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-8">
                No clicks yet. Share your referral link to get started!
              </p>
            )}
          </CardContent>
        </Card>

        {/* Recent Signups */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Recent Signups</CardTitle>
            <CardDescription>Users who joined via your link</CardDescription>
          </CardHeader>
          <CardContent>
            {data?.recentSignups && data.recentSignups.length > 0 ? (
              <div className="space-y-3">
                {data.recentSignups.map((user) => (
                  <div
                    key={user.id}
                    className="flex items-center justify-between py-2 border-b last:border-0"
                  >
                    <div className="flex items-center gap-3">
                      <div className="size-8 rounded-full bg-gradient-to-br from-[#0021F3] to-[#5C70EA] flex items-center justify-center text-white font-medium text-sm">
                        {user.name?.charAt(0).toUpperCase() || "?"}
                      </div>
                      <div>
                        <p className="text-sm font-medium">{user.name}</p>
                        <p className="text-xs text-muted-foreground">{user.email}</p>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {new Date(user.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-8">
                No signups yet. Keep sharing your referral link!
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* How It Works */}
      <Card>
        <CardHeader>
          <CardTitle>How It Works</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 md:grid-cols-3">
            <div className="text-center">
              <div className="size-12 rounded-full bg-[#0021F3]/10 flex items-center justify-center mx-auto mb-3">
                <Share2 className="size-6 text-[#0021F3]" />
              </div>
              <h3 className="font-medium mb-1">1. Share Your Link</h3>
              <p className="text-sm text-muted-foreground">
                Share your unique referral link with friends, colleagues, or on social media.
              </p>
            </div>
            <div className="text-center">
              <div className="size-12 rounded-full bg-[#5C70EA]/10 flex items-center justify-center mx-auto mb-3">
                <Users className="size-6 text-[#5C70EA]" />
              </div>
              <h3 className="font-medium mb-1">2. They Sign Up</h3>
              <p className="text-sm text-muted-foreground">
                When someone clicks your link and creates an account, they're tracked as your referral.
              </p>
            </div>
            <div className="text-center">
              <div className="size-12 rounded-full bg-[#37AEE2]/10 flex items-center justify-center mx-auto mb-3">
                <DollarSign className="size-6 text-[#37AEE2]" />
              </div>
              <h3 className="font-medium mb-1">3. Earn 10%</h3>
              <p className="text-sm text-muted-foreground">
                When they subscribe to a paid plan, you earn 10% of their subscription as commission!
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({
  title,
  value,
  description,
  icon,
  highlight,
}: {
  title: string;
  value: string | number;
  description: string;
  icon: React.ReactNode;
  highlight?: boolean;
}) {
  return (
    <Card className={highlight ? "border-[#0021F3]/20 bg-[#0021F3]/5 dark:border-[#5C70EA]/20 dark:bg-[#5C70EA]/5" : ""}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className={`text-2xl font-bold ${highlight ? "text-[#0021F3] dark:text-[#5C70EA]" : ""}`}>
          {value}
        </div>
        <p className="text-xs text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );
}

function ReferralsDashboardSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-40 w-full" />
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-28" />
        ))}
      </div>
      <Skeleton className="h-48 w-full" />
      <div className="grid gap-6 lg:grid-cols-2">
        <Skeleton className="h-64" />
        <Skeleton className="h-64" />
      </div>
    </div>
  );
}

export function ReferralsLoading() {
  return <ReferralsDashboardSkeleton />;
}

export function ReferralsError() {
  return (
    <div className="flex flex-col items-center justify-center py-12">
      <p className="text-red-500 mb-4">Failed to load referral data</p>
      <Button variant="outline" onClick={() => window.location.reload()}>
        Try Again
      </Button>
    </div>
  );
}

