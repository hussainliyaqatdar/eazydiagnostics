import { PAYMENT_LABELS, REPORT_LABELS, STATUS_LABELS, type OrderStatus, type PaymentStatus, type ReportStatus } from "@/lib/order-status";

// Read-only status pills. A status is always shown as a pill (colour + dot + label), never as a
// form control; changing it is a separate, deliberate action (see OrderControls / MemberReport).
const VISIT: Record<OrderStatus, string> = {
  booked: "bg-slate-100 text-slate-700 ring-slate-300",
  visit_scheduled: "bg-blue-50 text-blue-800 ring-blue-300",
  samples_collected: "bg-indigo-50 text-indigo-800 ring-indigo-300",
  reached_lab: "bg-violet-50 text-violet-800 ring-violet-300",
  partially_complete: "bg-amber-50 text-amber-900 ring-amber-300",
  completed: "bg-green-50 text-green-800 ring-green-300",
  cancelled: "bg-red-50 text-red-800 ring-red-300",
};
const PAYMENT: Record<PaymentStatus, string> = {
  pending: "bg-amber-50 text-amber-900 ring-amber-300",
  paid: "bg-green-50 text-green-800 ring-green-300",
  refunded: "bg-purple-50 text-purple-800 ring-purple-300",
};
const REPORT: Record<ReportStatus, string> = {
  none: "bg-slate-100 text-slate-600 ring-slate-300",
  partial: "bg-amber-50 text-amber-900 ring-amber-300",
  full: "bg-green-50 text-green-800 ring-green-300",
};

function Pill({ label, tone, prefix }: { label: string; tone: string; prefix?: string }) {
  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${tone}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden="true" />
      {prefix && <span className="font-medium opacity-70">{prefix}</span>}
      {label}
    </span>
  );
}

export const VisitPill = ({ status, prefix }: { status: OrderStatus; prefix?: string }) => <Pill label={STATUS_LABELS[status]} tone={VISIT[status]} prefix={prefix} />;
export const PaymentPill = ({ status, prefix }: { status: PaymentStatus; prefix?: string }) => <Pill label={PAYMENT_LABELS[status]} tone={PAYMENT[status]} prefix={prefix} />;
export const ReportPill = ({ status, prefix }: { status: ReportStatus; prefix?: string }) => <Pill label={REPORT_LABELS[status]} tone={REPORT[status]} prefix={prefix} />;
