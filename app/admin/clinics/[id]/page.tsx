import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import ClinicEditor from "@/components/admin/ClinicEditor";
import DoctorEditor from "@/components/admin/DoctorEditor";
import DoctorTabs from "@/components/admin/DoctorTabs";
import { affiliateLink } from "@/lib/affiliate-link";
import { clinicLogoUrl, getClinic, listClinics } from "@/lib/clinics";
import { listClinicDoctors } from "@/lib/doctors";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Clinic", robots: { index: false, follow: false } };

export default async function AdminClinicPage({ params }: { params: { id: string } }) {
  const clinic = await getClinic(params.id).catch(() => undefined);
  if (!clinic) notFound();
  const [doctors, clinics] = await Promise.all([listClinicDoctors(clinic.id), listClinics()]);

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <div>
        <Link href="/admin/doctors" className="text-sm text-brand hover:underline">&larr; All clinics</Link>
        <h1 className="mt-1 text-2xl font-bold text-gray-900">{clinic.name}</h1>
        <p className="text-xs text-gray-400">{clinic.id}</p>
      </div>

      <ClinicEditor clinic={clinic} logoUrl={clinicLogoUrl(clinic)} />

      <DoctorTabs
        clinicId={clinic.id}
        tabs={doctors.map((d) => ({
          id: d.id,
          label: d.name,
          pending: !d.approved,
          content: <DoctorEditor mode="edit" doctor={d} link={affiliateLink(d.id)} clinics={clinics.map((c) => ({ id: c.id, name: c.name }))} />,
        }))}
      />
    </div>
  );
}
