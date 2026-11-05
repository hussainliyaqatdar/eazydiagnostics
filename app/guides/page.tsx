import type { Metadata } from "next";
import Link from "next/link";
import { GUIDES } from "@/lib/guides";
import { SITE_URL } from "@/lib/site-config";

export const metadata: Metadata = {
  title: "Health test guides",
  description: "Plain-language guides to blood tests and health checkups: how to prepare, which tests to consider, and what a checkup costs.",
  alternates: { canonical: `${SITE_URL}/guides` },
};

export default function GuidesIndexPage() {
  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <nav className="text-sm text-gray-500" aria-label="Breadcrumb">
        <Link href="/" className="hover:text-brand">Home</Link> {" / "}
        <span className="text-gray-700">Guides</span>
      </nav>

      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold text-gray-900 md:text-3xl">Health test guides</h1>
        <p className="text-gray-600">
          Short, plain-language answers to common questions about blood tests and checkups. General information only: your doctor knows your health best.
        </p>
      </header>

      <ul className="flex flex-col gap-4">
        {GUIDES.map((g) => (
          <li key={g.slug}>
            <Link href={`/guides/${g.slug}`} className="block rounded-xl border bg-white p-5 transition hover:border-brand">
              <h2 className="text-lg font-semibold text-gray-900">{g.title}</h2>
              <p className="mt-1 text-sm text-gray-600">{g.description}</p>
              <span className="mt-3 inline-block text-sm font-medium text-brand">Read the guide &rarr;</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
