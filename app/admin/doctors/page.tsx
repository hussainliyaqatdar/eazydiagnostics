import type { Metadata } from "next";
import CopyLinkButton from "@/components/CopyLinkButton";
import DeleteDoctorButton from "@/components/DeleteDoctorButton";
import { affiliateLink } from "@/lib/affiliate-link";
import { formatMobile } from "@/lib/doctor-onboarding";
import { listDoctors, type Doctor } from "@/lib/doctors";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Registered doctors", robots: { index: false, follow: false } };

export default async function AdminDoctorsPage() {
  let doctors: Doctor[] = [];
  let loadError = "";
  try {
    // Newest first.
    doctors = (await listDoctors({ fresh: true })).slice().reverse();
  } catch (err) {
    console.error("Admin: doctor list could not be loaded:", err);
    loadError = "Couldn't load the registered doctors. Check the Google Sheet settings and try again.";
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Registered doctors</h1>
          <p className="text-sm text-gray-500">
            {doctors.length} registered. Each doctor&apos;s affiliate link pre-fills &ldquo;Prescribed by&rdquo; at checkout - share it, or turn it into a QR code.
          </p>
        </div>
        <a href="/for-doctors#signup" className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark">
          Register a doctor
        </a>
      </div>

      {loadError && <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{loadError}</p>}
      {!loadError && doctors.length === 0 && <p className="text-gray-500">No doctors registered yet.</p>}

      {doctors.length > 0 && (
        <div className="overflow-x-auto rounded-lg border bg-white">
          <table className="w-full min-w-[56rem] text-left text-sm">
            <thead className="border-b bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-3 py-2 font-semibold">Doctor</th>
                <th className="px-3 py-2 font-semibold">Clinic</th>
                <th className="px-3 py-2 font-semibold">Contact</th>
                <th className="px-3 py-2 font-semibold">Registered (IST)</th>
                <th className="px-3 py-2 font-semibold">Affiliate booking link</th>
                <th className="px-3 py-2 font-semibold"><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {doctors.map((d) => {
                const link = affiliateLink(d.id);
                return (
                  <tr key={d.id} className="align-top">
                    <td className="px-3 py-3">
                      <span className="block font-medium text-gray-900">{d.name}</span>
                      <span className="block text-xs text-gray-500">
                        {d.specialty} &middot; {d.degree}
                      </span>
                      <span className="block text-xs text-gray-400">{d.id}</span>
                    </td>
                    <td className="px-3 py-3 text-gray-800">{d.clinic}</td>
                    <td className="px-3 py-3 text-gray-800">
                      {d.mobile && <span className="block">{formatMobile(d.mobile)} (WhatsApp)</span>}
                      {d.email && <span className="block break-all">{d.email}</span>}
                      {!d.mobile && !d.email && <span className="text-gray-400">-</span>}
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap text-gray-600">{d.registeredAt}</td>
                    <td className="px-3 py-3">
                      <div className="flex items-start gap-2">
                        <a href={link} target="_blank" rel="noopener noreferrer" className="min-w-0 break-all text-brand hover:underline">
                          {link}
                        </a>
                        <CopyLinkButton text={link} />
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <DeleteDoctorButton id={d.id} name={d.name} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
