import type { ToastInput, ToastLine } from "./Toaster";

// What came back from a status change that may have WhatsApped people (see lib/order-notifications.ts).
export type Outcome = { recipient: string; ok: boolean; detail: string; skipped?: boolean; notSent?: "unmapped" | "unusable" };

function lineFor(o: Outcome): ToastLine {
  if (o.notSent) return { text: o.detail };
  if (o.skipped) return { text: `Already sent to ${o.recipient}.` };
  return o.ok ? { ok: true, text: `Sent to ${o.recipient}.` } : { ok: false, text: `Not sent to ${o.recipient}: ${o.detail}` };
}

// One toast for a status change: that it was saved, and for each audience whether a WhatsApp message went
// out - or why not (no template mapped, template not approved, a failure). `what` e.g. "Visit status".
export function statusToast(what: string, to: string, changed: boolean, outcomes: Outcome[]): ToastInput {
  if (!changed) return { kind: "info", title: `${what} is already ${to}`, message: "Nothing changed, so nothing was sent." };
  const lines = outcomes.map(lineFor);
  const trouble = outcomes.some((o) => !o.ok);
  return {
    kind: trouble ? "warning" : "success",
    title: `${what} updated to ${to}`,
    message: outcomes.length === 0 ? "No WhatsApp message goes out for this change." : undefined,
    lines,
  };
}
