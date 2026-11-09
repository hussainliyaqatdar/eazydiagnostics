import { BUSINESS_NAME, PARTNER_TAGLINE } from "@/lib/site-config";
import type { ClinicBrand } from "@/lib/brand";

// Nested-hearts mark: a smaller heart cradled inside a larger one, reading as
// "caring for two" (mother + baby) - warm and immediately legible at small
// sizes (favicon, app icon) while staying on-brand (teal + coral).
export function LogoMark({ className = "w-9 h-9" }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 92" className={className} role="img" aria-label={`${BUSINESS_NAME} logo`} xmlns="http://www.w3.org/2000/svg">
      <path
        d="M50 90 C22 70 2 50 2 27 C2 11 14 0 29 0 C39 0 47 6 50 15 C53 6 61 0 71 0 C86 0 98 11 98 27 C98 50 78 70 50 90 Z"
        fill="#0F6E6E"
      />
      <path
        d="M50 70 C33 57 21 44 21 29 C21 19 28 12 37 12 C43 12 48 15 50 21 C52 15 57 12 63 12 C72 12 79 19 79 29 C79 44 67 57 50 70 Z"
        fill="#FF7A45"
      />
    </svg>
  );
}

export default function Logo({ className = "", brand = null }: { className?: string; brand?: ClinicBrand | null }) {
  // A clinic's version: the clinic's own logo and name, nothing of ours.
  if (brand) {
    return (
      <span className={`inline-flex items-center gap-2.5 ${className}`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={brand.logo} alt={`${brand.name} logo`} className="h-11 w-11 shrink-0 object-contain" />
        <span className="block text-lg font-bold leading-tight tracking-tight text-brand-dark">{brand.name}</span>
      </span>
    );
  }
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <LogoMark />
      <span className="leading-tight">
        <span className="block font-bold text-xl text-brand-dark tracking-tight">Eazy</span>
        <span className="block text-[10px] font-semibold text-brand-accent uppercase tracking-widest -mt-1">Diagnostics</span>
        {/* Small, always-visible line: we are a partner of the lab, not the lab
            itself - keeps the brand name above from reading as a claim to be Agilus. */}
        <span className="block text-[8px] font-normal text-gray-400 tracking-wide -mt-0.5">{PARTNER_TAGLINE}</span>
      </span>
    </span>
  );
}
