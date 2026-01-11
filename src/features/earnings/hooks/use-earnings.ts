"use client";

import { useTRPC } from "@/trpc/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export function useWalletBalance() {
  const trpc = useTRPC();
  return useQuery(trpc.earnings.getWalletBalance.queryOptions());
}

export function useEarningsHistory(
  type: "all" | "referral" | "template" = "all",
  limit = 20
) {
  const trpc = useTRPC();
  return useQuery(
    trpc.earnings.getEarningsHistory.queryOptions({ type, limit })
  );
}

export function usePayoutHistory(
  status?: "PENDING" | "APPROVED" | "PROCESSING" | "COMPLETED" | "REJECTED" | "CANCELLED",
  limit = 20
) {
  const trpc = useTRPC();
  return useQuery(
    trpc.earnings.getPayoutHistory.queryOptions({ status, limit })
  );
}

export function useRequestPayout() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  return useMutation(
    trpc.earnings.requestPayout.mutationOptions({
      onSuccess: () => {
        // Invalidate wallet balance and payout history
        queryClient.invalidateQueries({ queryKey: [["earnings", "getWalletBalance"]] });
        queryClient.invalidateQueries({ queryKey: [["earnings", "getPayoutHistory"]] });
      },
    })
  );
}

export function useCancelPayout() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  return useMutation(
    trpc.earnings.cancelPayout.mutationOptions({
      onSuccess: () => {
        // Invalidate wallet balance and payout history
        queryClient.invalidateQueries({ queryKey: [["earnings", "getWalletBalance"]] });
        queryClient.invalidateQueries({ queryKey: [["earnings", "getPayoutHistory"]] });
      },
    })
  );
}

