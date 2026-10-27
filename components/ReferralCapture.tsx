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
    } catch {
      // Storage can be blocked (private mode) - the patient can still pick the doctor by hand.
    }
  }, []);
  return null;
}
