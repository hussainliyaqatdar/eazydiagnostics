import type { Metadata } from "next";
import DoctorSignupForm from "@/components/DoctorSignupForm";
import TrustMarkers from "@/components/TrustMarkers";

// Not indexed: this is a page to send to doctors and for the sales team to use,
// not part of the patient-facing site's search presence. Remove `robots` to let
// search engines list it.
export const metadata: Metadata = {
  title: "Register as a partner doctor",
  description: "Unlock trusted diagnostics at-home for your patients.",
  robots: { index: false, follow: false },
};

export default function ForDoctorsPage() {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-10 lg:grid-cols-[1fr_minmax(0,32rem)] lg:items-start lg:gap-14">
      <div className="flex flex-col gap-4">
        <header className="flex flex-col gap-4">
          <span className="w-fit rounded-full bg-brand-light px-3 py-1 text-xs font-semibold uppercase tracking-wide text-brand-dark">
            For doctors
          </span>
          <h1 className="text-3xl font-bold leading-tight text-gray-900 md:text-4xl">
            Unlock trusted diagnostics at-home for your patients
          </h1>
          <a href="#signup" className="w-fit rounded-lg bg-brand px-6 py-3 font-semibold text-white transition hover:bg-brand-dark lg:hidden">
            Register now
          </a>
        </header>

        {/* The same trust markers as the home page. */}
        <TrustMarkers twoByTwo />
      </div>

      <div id="signup" className="scroll-mt-24">
        <DoctorSignupForm />
      </div>
    </div>
  );
}
