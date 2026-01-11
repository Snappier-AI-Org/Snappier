"use client";

import { useState } from "react";
import {
  Wallet,
  TrendingUp,
  Clock,
  CheckCircle,
  DollarSign,
  ArrowUpRight,
  Loader2,
  Users,
  FileText,
  AlertCircle,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { useWalletBalance, useEarningsHistory, usePayoutHistory } from "../hooks/use-earnings";
import { WithdrawDialog } from "./withdraw-dialog";

function formatCurrency(cents: number, currency = "USD") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).format(cents / 100);
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(date));
}

export function EarningsDashboard() {
  const [isWithdrawOpen, setIsWithdrawOpen] = useState(false);
  const { data: wallet, isLoading: walletLoading } = useWalletBalance();
  const { data: earningsData, isLoading: earningsLoading } = useEarningsHistory("all", 20);
  const { data: payoutsData, isLoading: payoutsLoading } = usePayoutHistory(undefined, 10);

  if (walletLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const canWithdraw = wallet && wallet.totals.withdrawable >= wallet.minimumWithdrawal;

  return (
    <div className="space-y-6">
      {/* Wallet Balance Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="bg-linear-to-br from-[#0021F3]/10 to-[#5C70EA]/5 border-[#0021F3]/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Available Balance</CardTitle>
            <Wallet className="size-4 text-[#0021F3]" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-[#0021F3] dark:text-[#5C70EA]">
              {formatCurrency(wallet?.totals.available || 0)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Ready for withdrawal
            </p>
          </CardContent>
        </Card>

        <Card className="bg-linear-to-br from-amber-500/10 to-amber-600/5 border-amber-500/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Clock className="size-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">
              {formatCurrency(wallet?.totals.pending || 0)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Being processed
            </p>
          </CardContent>
        </Card>

        <Card className="bg-linear-to-br from-blue-500/10 to-blue-600/5 border-blue-500/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Earned</CardTitle>
            <TrendingUp className="size-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {formatCurrency(
                (wallet?.totals.available || 0) +
                (wallet?.totals.pending || 0) +
                (wallet?.totals.withdrawn || 0)
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Lifetime earnings
            </p>
          </CardContent>
        </Card>

        <Card className="bg-linear-to-br from-purple-500/10 to-purple-600/5 border-purple-500/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Withdrawn</CardTitle>
            <CheckCircle className="size-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">
              {formatCurrency(wallet?.totals.withdrawn || 0)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Successfully paid out
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Earnings Breakdown */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Users className="size-5 text-blue-500" />
              <CardTitle className="text-lg">Referral Earnings</CardTitle>
            </div>
            <CardDescription>10% commission from referred subscriptions</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Available</span>
              <span className="font-semibold text-[#0021F3] dark:text-[#5C70EA]">
                {formatCurrency(wallet?.referral.available || 0)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Pending</span>
              <span className="font-semibold text-amber-600">
                {formatCurrency(wallet?.referral.pending || 0)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Total withdrawn</span>
              <span className="font-semibold text-purple-600">
                {formatCurrency(wallet?.referral.withdrawn || 0)}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <FileText className="size-5 text-orange-500" />
              <CardTitle className="text-lg">Template Sales</CardTitle>
            </div>
            <CardDescription>90% revenue from your template sales</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Available</span>
              <span className="font-semibold text-[#0021F3] dark:text-[#5C70EA]">
                {formatCurrency(wallet?.template.available || 0)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Pending</span>
              <span className="font-semibold text-amber-600">
                {formatCurrency(wallet?.template.pending || 0)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Total withdrawn</span>
              <span className="font-semibold text-purple-600">
                {formatCurrency(wallet?.template.withdrawn || 0)}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Withdraw Button */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-semibold">Request Withdrawal</h3>
              <p className="text-sm text-muted-foreground">
                Minimum withdrawal: {formatCurrency(wallet?.minimumWithdrawal || 1000)}
              </p>
              {(wallet?.totals?.pendingPayout ?? 0) > 0 && (
                <p className="text-sm text-amber-600 flex items-center gap-1 mt-1">
                  <AlertCircle className="size-3" />
                  {formatCurrency(wallet?.totals?.pendingPayout ?? 0)} pending in withdrawal requests
                </p>
              )}
            </div>
            <Button
              size="lg"
              onClick={() => setIsWithdrawOpen(true)}
              disabled={!canWithdraw}
              className="gap-2"
            >
              <ArrowUpRight className="size-4" />
              Withdraw {formatCurrency(wallet?.totals.withdrawable || 0)}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Tabs for History */}
      <Tabs defaultValue="earnings" className="w-full">
        <TabsList>
          <TabsTrigger value="earnings">Earnings History</TabsTrigger>
          <TabsTrigger value="payouts">Payout Requests</TabsTrigger>
        </TabsList>

        <TabsContent value="earnings" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Earnings</CardTitle>
              <CardDescription>Your earnings from referrals and template sales</CardDescription>
            </CardHeader>
            <CardContent>
              {earningsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="size-6 animate-spin" />
                </div>
              ) : earningsData?.earnings.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <DollarSign className="size-12 mx-auto mb-3 opacity-20" />
                  <p>No earnings yet</p>
                  <p className="text-sm">Start earning by sharing your referral link or selling templates!</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {earningsData?.earnings.map((earning) => (
                    <div
                      key={earning.id}
                      className="flex items-center justify-between py-3 border-b last:border-0"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`p-2 rounded-full ${
                            earning.type === "referral"
                              ? "bg-blue-100 text-blue-600"
                              : "bg-orange-100 text-orange-600"
                          }`}
                        >
                          {earning.type === "referral" ? (
                            <Users className="size-4" />
                          ) : (
                            <FileText className="size-4" />
                          )}
                        </div>
                        <div>
                          <p className="font-medium">{earning.description}</p>
                          <p className="text-sm text-muted-foreground">
                            {formatDate(earning.createdAt)}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-[#0021F3] dark:text-[#5C70EA]">
                          +{formatCurrency(earning.amount)}
                        </p>
                        <Badge
                          variant={
                            earning.status === "AVAILABLE" || earning.status === "APPROVED"
                              ? "default"
                              : earning.status === "PENDING"
                              ? "secondary"
                              : "outline"
                          }
                          className="text-xs"
                        >
                          {earning.status.toLowerCase()}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payouts" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Payout Requests</CardTitle>
              <CardDescription>Your withdrawal request history</CardDescription>
            </CardHeader>
            <CardContent>
              {payoutsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="size-6 animate-spin" />
                </div>
              ) : payoutsData?.payouts.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <ArrowUpRight className="size-12 mx-auto mb-3 opacity-20" />
                  <p>No payout requests yet</p>
                  <p className="text-sm">Request a withdrawal when you have earnings available.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {payoutsData?.payouts.map((payout: {
                    id: string;
                    method: string;
                    createdAt: Date;
                    amount: number;
                    status: string;
                  }) => (
                    <div
                      key={payout.id}
                      className="flex items-center justify-between py-3 border-b last:border-0"
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-full bg-purple-100 text-purple-600">
                          <ArrowUpRight className="size-4" />
                        </div>
                        <div>
                          <p className="font-medium">
                            Withdrawal via {payout.method.replace("_", " ").toLowerCase()}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {formatDate(payout.createdAt)}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">{formatCurrency(payout.amount)}</p>
                        <Badge
                          variant={
                            payout.status === "COMPLETED"
                              ? "default"
                              : payout.status === "PENDING" ||
                                payout.status === "APPROVED" ||
                                payout.status === "PROCESSING"
                              ? "secondary"
                              : "destructive"
                          }
                          className="text-xs"
                        >
                          {payout.status.toLowerCase()}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Withdraw Dialog */}
      <WithdrawDialog
        open={isWithdrawOpen}
        onOpenChange={setIsWithdrawOpen}
        availableBalance={wallet?.totals.withdrawable || 0}
        minimumWithdrawal={wallet?.minimumWithdrawal || 1000}
      />
    </div>
  );
}

