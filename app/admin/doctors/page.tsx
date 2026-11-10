import type { Metadata } from "next";
import Link from "next/link";
import CreateClinicForm from "@/components/admin/CreateClinicForm";
import { clinicLogoUrl, listClinics, type Clinic } from "@/lib/clinics";
import { listDoctors } from "@/lib/doctors";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Clinics and doctors", robots: { index: false, follow: false } };

export default async function AdminClinicsPage() {
  let clinics: Clinic[] = [];
  let pending = 0;
  let loadError = "";
  try {
    clinics = await listClinics();
    pending = (await listDoctors()).filter((d) => !d.approved).length;
  } catch (err) {
    console.error("Admin: clinics could not be loaded:", err);
    loadError = `Couldn't load the clinics: ${err instanceof Error ? err.message : "unknown error"}`;
  }
  const doctorTotal = clinics.reduce((n, c) => n + c.doctorCount, 0);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Clinics and doctors</h1>
          <p className="text-sm text-gray-500">
            {clinics.length} clinic{clinics.length === 1 ? "" : "s"}, {doctorTotal} doctor{doctorTotal === 1 ? "" : "s"}. Open a clinic to edit its details, logo, doctors and who collects payment.
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

      {clinics.length > 0 && (
        <div className="overflow-x-auto rounded-lg border bg-white">
          <table className="w-full min-w-[48rem] text-left text-sm">
            <thead className="border-b bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-3 py-2 font-semibold">Clinic</th>
                <th className="px-3 py-2 font-semibold">Address</th>
                <th className="px-3 py-2 font-semibold">Doctors</th>
                <th className="px-3 py-2 font-semibold">Payment collected by</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {clinics.map((c) => {
                const logo = clinicLogoUrl(c);
                return (
                  <tr key={c.id} className="align-middle">
                    <td className="px-3 py-3">
                      <Link href={`/admin/clinics/${c.id}`} className="flex items-center gap-3 font-medium text-brand hover:underline">
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-md border bg-gray-50">
                          {logo ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={logo} alt="" className="h-full w-full object-contain" />
                          ) : (
                            <span className="text-[10px] text-gray-400">no logo</span>
                          )}
                        </span>
                        <span>
                          {c.name}
                          <span className="block text-xs font-normal text-gray-400">{c.id}</span>
                        </span>
                      </Link>
                    </td>
                    <td className="px-3 py-3 text-gray-700">{c.address || <span className="text-gray-400">-</span>}</td>
                    <td className="px-3 py-3 text-gray-700">{c.doctorCount}</td>
                    <td className="px-3 py-3 text-gray-700">{c.paymentCollector === "clinic" ? "Clinic" : "Eazy Diagnostics"}</td>
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
