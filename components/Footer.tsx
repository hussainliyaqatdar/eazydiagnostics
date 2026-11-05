import Link from "next/link";
import { AREAS } from "@/lib/areas";
import { GUIDES } from "@/lib/guides";
import { BUSINESS_NAME, PARTNER_TAGLINE, BOOKING_PHONE, BOOKING_PHONE_TEL, SUPPORT_EMAIL, SERVICE_AREAS } from "@/lib/site-config";

export default function Footer() {
  return (
    <footer className="border-t mt-16 py-8 text-sm text-gray-500">
      <div className="max-w-6xl mx-auto px-4 flex flex-col gap-2">
        <p className="font-medium text-gray-700">{BUSINESS_NAME}</p>
        <p className="text-xs text-gray-400 -mt-2">{PARTNER_TAGLINE}</p>
        <p>Home sample collection across {SERVICE_AREAS.join(", ")} - and beyond, on request.</p>
        <p>NABL-accredited testing, in partnership with Fortis Hospitals.</p>
        <nav aria-label="Areas and guides" className="grid gap-4 py-2 sm:grid-cols-2">
          <div>
            <p className="font-medium text-gray-700 mb-1">Blood test at home</p>
            <ul className="flex flex-col gap-0.5">
              {AREAS.map((a) => (
                <li key={a.slug}>
                  <Link href={`/blood-test-at-home/${a.slug}`} className="hover:text-brand hover:underline">{a.name}</Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="font-medium text-gray-700 mb-1">Guides</p>
            <ul className="flex flex-col gap-0.5">
              {GUIDES.map((g) => (
                <li key={g.slug}>
                  <Link href={`/guides/${g.slug}`} className="hover:text-brand hover:underline">{g.title}</Link>
                </li>
              ))}
            </ul>
          </div>
        </nav>
        <p>
          Call to book: <a href={`tel:${BOOKING_PHONE_TEL}`} className="text-brand hover:underline">{BOOKING_PHONE}</a> &middot; {SUPPORT_EMAIL}
        </p>
        <p className="text-xs">
          Reports are shared via WhatsApp. This site provides general information about diagnostic tests and does not
          replace professional medical advice; please consult your doctor to interpret your results.
        </p>
      </div>
    </footer>
  );
}
