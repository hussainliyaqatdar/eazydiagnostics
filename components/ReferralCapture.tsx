"use client";
import { useEffect } from "react";
import { DOCTOR_ID_RE, REF_PARAM, REFERRAL_STORAGE_KEY } from "@/lib/referral-storage";

// Remembers the doctor id from an affiliate link (/?ref=DR-XXXX), so it is still
// there at checkout after the patient has browsed and filled the cart. Renders
// nothing.
export default function ReferralCapture() {
  useEffect(() => {
    try {
      const ref = new URLSearchParams(window.location.search).get(REF_PARAM)?.trim().toUpperCase();
      if (ref && DOCTOR_ID_RE.test(ref)) localStorage.setItem(REFERRAL_STORAGE_KEY, ref);
      else if (window.location.pathname === "/") {
        // Opening the plain home page (not reloading it) leaves any earlier referral link behind.
        const nav = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined;
        if (!nav || nav.type === "navigate") localStorage.removeItem(REFERRAL_STORAGE_KEY);
      }
    } catch {
      // Storage can be blocked (private mode) - the patient can still pick the doctor by hand.
    }
  }, []);
  return null;
}
