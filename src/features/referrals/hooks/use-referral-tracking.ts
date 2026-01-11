"use client";

import { useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";

const REFERRAL_COOKIE_KEY = "ref_code";
const REFERRAL_COOKIE_EXPIRY_DAYS = 30;

/**
 * Hook to track and persist referral codes from URL
 * Call this on pages where referral links might land (home, login, signup)
 */
export function useReferralTracking() {
  const searchParams = useSearchParams();
  const refCode = searchParams.get("ref");

  useEffect(() => {
    if (refCode) {
      const existingRef = getReferralCode();
      const isNewCode = existingRef !== refCode;

      // Store referral code in cookie
      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + REFERRAL_COOKIE_EXPIRY_DAYS);
      document.cookie = `${REFERRAL_COOKIE_KEY}=${refCode}; expires=${expiryDate.toUTCString()}; path=/; SameSite=Lax`;

      // Only track if we haven't already stored this code
      if (isNewCode) {
        fetch("/api/referral/track", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            referralCode: refCode,
            userAgent: navigator.userAgent,
            referer: document.referrer,
          }),
        }).catch((err) => {
          console.error("Failed to track referral click:", err);
        });
      }
    }
  }, [refCode]);

  return refCode;
}

/**
 * Get the stored referral code from cookies
 */
export function getReferralCode(): string | null {
  if (typeof document === "undefined") return null;

  const cookies = document.cookie.split(";");
  for (const cookie of cookies) {
    const [name, value] = cookie.trim().split("=");
    if (name === REFERRAL_COOKIE_KEY) {
      return value;
    }
  }
  return null;
}

/**
 * Clear the referral code cookie (call after successful signup attribution)
 */
export function clearReferralCode() {
  if (typeof document === "undefined") return;
  document.cookie = `${REFERRAL_COOKIE_KEY}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
}

/**
 * Hook to get the current referral code (from URL or cookie)
 */
export function useReferralCode(): string | null {
  const searchParams = useSearchParams();
  const urlRefCode = searchParams.get("ref");
  
  // Prefer URL param, fallback to cookie
  if (urlRefCode) return urlRefCode;
  return getReferralCode();
}

