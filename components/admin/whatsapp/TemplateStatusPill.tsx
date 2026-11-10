// A template's state at Meta, as a coloured pill.
const TONES: Record<string, string> = {
  APPROVED: "bg-green-50 text-green-800 ring-green-300",
  PENDING: "bg-amber-50 text-amber-900 ring-amber-300",
  IN_APPEAL: "bg-amber-50 text-amber-900 ring-amber-300",
  REJECTED: "bg-red-50 text-red-800 ring-red-300",
  DRAFT: "bg-slate-100 text-slate-700 ring-slate-300",
  PAUSED: "bg-orange-50 text-orange-800 ring-orange-300",
  DISABLED: "bg-orange-50 text-orange-800 ring-orange-300",
  FLAGGED: "bg-orange-50 text-orange-800 ring-orange-300",
};

const LABELS: Record<string, string> = {
  APPROVED: "Approved",
  PENDING: "In review",
  IN_APPEAL: "In appeal",
  REJECTED: "Rejected",
  DRAFT: "Draft",
  PAUSED: "Paused",
  DISABLED: "Disabled",
  FLAGGED: "Flagged",
};

export default function TemplateStatusPill({ status }: { status: string }) {
  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${TONES[status] ?? TONES.DRAFT}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden="true" />
      {LABELS[status] ?? status}
    </span>
  );
}
