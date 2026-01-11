import { useTRPC } from "@/trpc/client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

/**
 * Hook to get referral stats
 */
export const useReferralStats = () => {
  const trpc = useTRPC();
  return useQuery(trpc.referrals.getStats.queryOptions());
};

/**
 * Hook to get referral link
 */
export const useReferralLink = () => {
  const trpc = useTRPC();
  return useQuery(trpc.referrals.getReferralLink.queryOptions());
};

/**
 * Hook to regenerate referral code
 */
export const useRegenerateReferralCode = () => {
  const queryClient = useQueryClient();
  const trpc = useTRPC();

  return useMutation(
    trpc.referrals.regenerateCode.mutationOptions({
      onSuccess: () => {
        toast.success("Referral code regenerated!");
        queryClient.invalidateQueries(trpc.referrals.getStats.queryOptions());
        queryClient.invalidateQueries(trpc.referrals.getReferralLink.queryOptions());
      },
      onError: (error) => {
        toast.error(`Failed to regenerate code: ${error.message}`);
      },
    })
  );
};

/**
 * Hook to get commission history
 */
export const useReferralCommissions = (
  status?: "PENDING" | "APPROVED" | "PAID" | "CANCELLED"
) => {
  const trpc = useTRPC();
  return useQuery(
    trpc.referrals.getCommissions.queryOptions({ status, limit: 50 })
  );
};

