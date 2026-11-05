import type { Metadata } from "next";
import Link from "next/link";
import { AREAS } from "@/lib/areas";
import { BUSINESS_NAME, SITE_URL } from "@/lib/site-config";

export const metadata: Metadata = {
  title: "Blood test at home in Bangalore",
  description: `Home blood test collection across JP Nagar, Jayanagar, BTM Layout, Banashankari and Kanakpura Road in Bangalore with ${BUSINESS_NAME}. Pay only after your sample is collected.`,
  alternates: { canonical: `${SITE_URL}/blood-test-at-home` },
};

export default function AreasIndexPage() {
  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <nav className="text-sm text-gray-500" aria-label="Breadcrumb">
        <Link href="/" className="hover:text-brand">Home</Link> {" / "}
        <span className="text-gray-700">Blood test at home</span>
      </nav>

      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold text-gray-900 md:text-3xl">Blood test at home in Bangalore</h1>
        <p className="text-gray-600">
          A trained phlebotomist collects your sample at home, it is tested in NABL-accredited labs, and your report arrives on WhatsApp. Pay only after collection. Choose your area:
        </p>
      </header>

      <ul className="grid gap-4 sm:grid-cols-2">
        {AREAS.map((a) => (
          <li key={a.slug}>
            <Link href={`/blood-test-at-home/${a.slug}`} className="block h-full rounded-xl border bg-white p-5 transition hover:border-brand">
              <h2 className="text-lg font-semibold text-gray-900">{a.name}</h2>
              <p className="mt-1 text-sm text-gray-600">Home blood test collection in {a.name}, Bangalore.</p>
              <span className="mt-3 inline-block text-sm font-medium text-brand">See how it works &rarr;</span>
            </Link>
          </li>
        ))}
      </ul>

      <p className="text-sm text-gray-600">
        Not in one of these areas? We will gladly try to reach you elsewhere in Bangalore too: ask at checkout or call us.
      </p>
    </div>
  );
}
