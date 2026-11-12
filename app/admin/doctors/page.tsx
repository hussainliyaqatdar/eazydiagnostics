import type { Metadata } from "next";
import Link from "next/link";
import CreateClinicForm from "@/components/admin/CreateClinicForm";
import QrStandeeButton from "@/components/admin/QrStandeeButton";
import CopyLinkButton from "@/components/CopyLinkButton";
import { affiliateLink } from "@/lib/affiliate-link";
import { clinicLogoUrl, listClinics, type Clinic } from "@/lib/clinics";
import { listDoctors } from "@/lib/doctors";
import type { Doctor } from "@/lib/types";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Clinics and doctors", robots: { index: false, follow: false } };

// "https://site.in/?ref=DR-ABC" -> "site.in/?ref=DR-ABC": the link as it reads, without the protocol.
const shown = (url: string) => url.replace(/^https?:\/\//, "");

export default async function AdminClinicsPage() {
  let clinics: Clinic[] = [];
  let pending = 0;
  let doctors: Doctor[] = [];
  let loadError = "";
  try {
    clinics = await listClinics();
    doctors = await listDoctors();
    pending = doctors.filter((d) => !d.approved).length;
  } catch (err) {
    console.error("Admin: clinics could not be loaded:", err);
    loadError = `Couldn't load the clinics: ${err instanceof Error ? err.message : "unknown error"}`;
  }
  const doctorTotal = clinics.reduce((n, c) => n + c.doctorCount, 0);
  const doctorsOf = (clinicId: string) => doctors.filter((d) => d.clinicId === clinicId);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Clinics and doctors</h1>
          <p className="text-sm text-gray-500">
            {clinics.length} clinic{clinics.length === 1 ? "" : "s"}, {doctorTotal} doctor{doctorTotal === 1 ? "" : "s"}. Each doctor&apos;s affiliate booking link is listed under their clinic; open a clinic to edit its details, logo, doctors and who collects payment.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <a href="/for-doctors#signup" className="rounded-md border border-brand px-3 py-2 text-sm font-semibold text-brand hover:bg-brand-light">
            Doctor sign-up form
          </a>
          <CreateClinicForm />
        </div>
      </div>

      {pending > 0 && (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          {pending} doctor{pending === 1 ? "" : "s"} joined an existing clinic and {pending === 1 ? "is" : "are"} waiting for your approval (marked below).
        </p>
      )}

      {loadError && <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{loadError}</p>}
      {!loadError && clinics.length === 0 && <p className="text-gray-500">No clinics yet. Use Register a clinic.</p>}

      <div className="flex flex-col gap-4">
        {clinics.map((c) => {
          const logo = clinicLogoUrl(c);
          const list = doctorsOf(c.id);
          return (
            <section key={c.id} aria-label={c.name} className="overflow-hidden rounded-lg border bg-white">
              {/* The clinic. */}
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b bg-gray-50 px-4 py-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-md border bg-white">
                  {logo ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={logo} alt="" className="h-full w-full object-contain" />
                  ) : (
                    <span className="text-[10px] text-gray-400">no logo</span>
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <Link href={`/admin/clinics/${c.id}`} className="font-semibold text-gray-900 hover:text-brand hover:underline">{c.name}</Link>
                  <p className="truncate text-xs text-gray-500">
                    {c.address || "No address"} <span className="text-gray-300">&middot;</span> {c.id}
                  </p>
                </div>
                <span className="rounded-full bg-white px-2.5 py-1 text-xs text-gray-600 ring-1 ring-inset ring-gray-200">
                  Payment: {c.paymentCollector === "clinic" ? "clinic" : "Eazy Diagnostics"}
                </span>
                <Link href={`/admin/clinics/${c.id}`} className="text-sm font-medium text-brand hover:underline">Edit clinic</Link>
              </div>

              {/* Its doctors, one row each, with the affiliate link in its own column. */}
              {list.length === 0 ? (
                <p className="px-4 py-3 text-sm text-gray-400">No doctors yet.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[46rem] text-left text-sm">
                    <thead className="text-[11px] uppercase tracking-wide text-gray-400">
                      <tr>
                        <th className="px-4 py-2 font-semibold">Doctor</th>
                        <th className="px-3 py-2 font-semibold">Specialty</th>
                        <th className="px-3 py-2 font-semibold">Affiliate link</th>
                        <th className="px-4 py-2 text-right font-semibold"><span className="sr-only">Actions</span></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {list.map((d) => {
                        const link = affiliateLink(d.id);
                        return (
                          <tr key={d.id} className="align-middle">
                            <td className="px-4 py-2.5">
                              <a href={link} target="_blank" rel="noopener noreferrer" title={`Open ${d.name}'s affiliate link`} className="font-medium text-brand hover:underline">
                                {d.name}
                              </a>
                              {!d.approved && <span className="ml-2 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-800">awaiting approval</span>}
                            </td>
                            <td className="px-3 py-2.5 text-gray-600">{d.specialty || <span className="text-gray-300">-</span>}</td>
                            <td className="max-w-[22rem] px-3 py-2.5">
                              <a href={link} target="_blank" rel="noopener noreferrer" className="block truncate rounded bg-gray-50 px-2 py-1 font-mono text-xs text-gray-600 hover:text-brand" title={link}>
                                {shown(link)}
                              </a>
                            </td>
                            <td className="px-4 py-2.5">
                              <span className="flex items-center justify-end gap-2">
                                <QrStandeeButton doctorName={d.name} clinicName={c.name} link={link} logoUrl={logo} />
                                <CopyLinkButton text={link} />
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}
