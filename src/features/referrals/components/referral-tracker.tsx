"use client";

import { useReferralTracking } from "@/features/referrals/hooks/use-referral-tracking";

/**
 * Global referral tracker. Mount once (e.g. in RootLayout) so any page
 * with a ?ref=CODE param will store and track the referral click.
 */
export function ReferralTracker() {
  useReferralTracking();
  return null;
}
