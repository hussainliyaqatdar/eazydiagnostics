import type { ToastInput, ToastLine } from "./Toaster";

// What came back from a status change that may have WhatsApped people (see lib/order-notifications.ts).
export type Outcome = { recipient: string; ok: boolean; detail: string; skipped?: boolean; notSent?: "unmapped" | "unusable"; what?: string };

function lineFor(o: Outcome, prefix: string): ToastLine {
  if (o.notSent) return { text: o.detail };
  if (o.skipped) return { text: `${prefix}Already sent to ${o.recipient}.` };
  return o.ok ? { ok: true, text: `${prefix}Sent to ${o.recipient}.` } : { ok: false, text: `${prefix}Not sent to ${o.recipient}: ${o.detail}` };
}

// One toast for a status change: that it was saved, and for each audience whether a WhatsApp message went
// out - or why not (no template mapped, template not approved, a failure). `what` e.g. "Visit status".
export function statusToast(what: string, to: string, changed: boolean, outcomes: Outcome[]): ToastInput {
  if (!changed) return { kind: "info", title: `${what} is already ${to}`, message: "Nothing changed, so nothing was sent." };
  // When one change sent two kinds of message (a status update and a payment request), say which is which.
  const mixed = new Set(outcomes.map((o) => o.what)).size > 1;
  const lines = outcomes.map((o) => lineFor(o, mixed && o.what ? `${o.what}: ` : ""));
  const trouble = outcomes.some((o) => !o.ok);
  return {
    kind: trouble ? "warning" : "success",
    title: `${what} updated to ${to}`,
    message: outcomes.length === 0 ? "No WhatsApp message goes out for this change." : undefined,
    lines,
  };
}

// The toast for the Request payment button.
export function requestToast(outcomes: Outcome[]): ToastInput {
  const lines = outcomes.map((o) => lineFor(o, ""));
  const sent = outcomes.some((o) => o.ok && !o.skipped && !o.notSent);
  return sent && outcomes.every((o) => o.ok)
    ? { kind: "success", title: "Payment request sent", lines }
    : { kind: "warning", title: sent ? "Payment request partly sent" : "Payment request not sent", lines };
}
