"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import DoctorEditor from "./DoctorEditor";
import Modal from "./Modal";
import { buttonClass } from "./api";

export type DoctorTab = { id: string; label: string; pending: boolean; content: React.ReactNode };

// One tab per doctor of the clinic, and a "Register a doctor" button that opens a dialog.
export default function DoctorTabs({ clinicId, tabs }: { clinicId: string; tabs: DoctorTab[] }) {
  const router = useRouter();
  const [active, setActive] = useState(tabs[0]?.id ?? "");
  const [open, setOpen] = useState(false);
  const current = tabs.find((t) => t.id === active) ?? tabs[0];

  return (
    <section className="flex flex-col gap-3" aria-label="Doctors">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold text-gray-900">Doctors ({tabs.length})</h2>
        <button type="button" onClick={() => setOpen(true)} className={buttonClass}>+ Register a doctor</button>
      </div>

      {tabs.length === 0 ? (
        <p className="text-sm text-gray-500">No doctors in this clinic yet. Register one.</p>
      ) : (
        <>
          <div role="tablist" aria-label="Doctors of this clinic" className="flex flex-wrap gap-1 border-b">
            {tabs.map((t) => (
              <button
                key={t.id}
                type="button"
                role="tab"
                aria-selected={t.id === current?.id}
                onClick={() => setActive(t.id)}
                className={`-mb-px rounded-t-md border px-3 py-2 text-sm font-medium ${t.id === current?.id ? "border-b-white bg-white text-brand" : "border-transparent text-gray-600 hover:text-brand"}`}
              >
                {t.label}
                {t.pending && <span className="ml-1.5 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-800">approval</span>}
              </button>
            ))}
          </div>
          <div role="tabpanel">{current?.content}</div>
        </>
      )}

      {open && (
        <Modal title="Register a doctor" onClose={() => setOpen(false)}>
          <DoctorEditor mode="add" clinicId={clinicId} onDone={() => { setOpen(false); router.refresh(); }} />
        </Modal>
      )}
    </section>
  );
}
