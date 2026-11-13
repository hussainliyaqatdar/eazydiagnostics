"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Modal from "../Modal";
import { buttonClass, inputClass, quietButtonClass, sendJson } from "../api";
import { useToast } from "../Toaster";
import TemplateForm from "./TemplateForm";
import TemplateStatusPill from "./TemplateStatusPill";
import type { WaTemplate } from "@/lib/whatsapp-templates";
import type { MediaItem } from "@/lib/whatsapp-media";
import { AUDIENCE_LABELS, eventLabel } from "@/lib/whatsapp-events";

// The templates: write one, send it to Meta, switch it on or off, test it on a phone, delete it, and
// pull the latest review results from Meta.
export default function TemplatesPanel({ templates, media, metaReady }: { templates: WaTemplate[]; media: MediaItem[]; metaReady: boolean }) {
  const router = useRouter();
  const [form, setForm] = useState<{ template: WaTemplate | null } | null>(null);
  const [testing, setTesting] = useState<WaTemplate | null>(null);
  const [deleting, setDeleting] = useState<WaTemplate | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const { toast } = useToast();

  async function run(key: string, fn: () => Promise<{ ok: boolean; text: string }>) {
    setBusy(key);
    const result = await fn();
    toast(result.ok ? { kind: "success", title: result.text } : { kind: "error", title: "That didn't work", message: result.text });
    setBusy(null);
    router.refresh();
  }

  const sync = () =>
    run("sync", async () => {
      const res = await sendJson<{ updated: number; imported: number; missing: number }>("/api/admin/whatsapp/sync", "POST", {});
      if (!res.ok) return { ok: false, text: res.error };
      const d = res.data;
      return { ok: true, text: `Synced with Meta: ${d.updated} updated, ${d.imported} imported${d.missing ? `, ${d.missing} no longer on Meta` : ""}.` };
    });

  const submit = (t: WaTemplate) =>
    run(`submit-${t.id}`, async () => {
      const res = await sendJson(`/api/admin/whatsapp/templates/${t.id}/submit`, "POST", {});
      return res.ok ? { ok: true, text: `${t.name} sent to Meta for review.` } : { ok: false, text: res.error };
    });

  const toggle = (t: WaTemplate) =>
    run(`toggle-${t.id}`, async () => {
      const res = await sendJson(`/api/admin/whatsapp/templates/${t.id}`, "PATCH", { enabled: !t.enabled });
      return res.ok ? { ok: true, text: `${t.name} switched ${t.enabled ? "off" : "on"}.` } : { ok: false, text: res.error };
    });

  const remove = (t: WaTemplate) =>
    run(`delete-${t.id}`, async () => {
      const res = await sendJson(`/api/admin/whatsapp/templates/${t.id}`, "DELETE");
      setDeleting(null);
      return res.ok ? { ok: true, text: `${t.name} deleted.` } : { ok: false, text: res.error };
    });

  const link = "text-xs font-medium text-brand hover:underline disabled:text-gray-400 disabled:no-underline";

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="max-w-xl text-sm text-gray-600">
          WhatsApp only lets us start a conversation with a template Meta has approved. Write one and submit it, then map it to a status on the Template - Status Mapping tab. A status with no template mapped sends nothing.
        </p>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={sync} disabled={busy !== null || !metaReady} title={metaReady ? "" : "Set WHATSAPP_ACCESS_TOKEN and WHATSAPP_BUSINESS_ACCOUNT_ID first"} className={quietButtonClass}>
            {busy === "sync" ? "Syncing..." : "Sync with Meta"}
          </button>
          <button type="button" onClick={() => setForm({ template: null })} className={buttonClass}>+ New template</button>
        </div>
      </div>

      {templates.length === 0 ? (
        <p className="rounded-lg border bg-white px-4 py-8 text-center text-sm text-gray-500">No templates yet. Create one, or sync to bring in the ones already at Meta.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border bg-white">
          <table className="w-full min-w-[56rem] text-left text-sm">
            <thead className="border-b bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-3 py-2 font-semibold">Template</th>
                <th className="px-3 py-2 font-semibold">Sent to</th>
                <th className="px-3 py-2 font-semibold">Mapped to</th>
                <th className="px-3 py-2 font-semibold">Status</th>
                <th className="px-3 py-2 font-semibold">On</th>
                <th className="px-3 py-2 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {templates.map((t) => {
                const submittable = t.status === "DRAFT" || t.status === "REJECTED";
                return (
                  <tr key={t.id} className="align-top">
                    <td className="px-3 py-3">
                      <span className="block font-mono text-[13px] font-medium text-gray-900">{t.name}</span>
                      <span className="block text-xs text-gray-500">{t.language} &middot; {t.category.toLowerCase()}{t.headerFormat === "IMAGE" ? " · image header" : ""}{t.buttons.length > 0 ? ` · ${t.buttons.length} link button${t.buttons.length > 1 ? "s" : ""}` : ""}</span>
                      <span className="mt-1 block max-w-xs text-xs text-gray-600">{t.body.length > 110 ? `${t.body.slice(0, 110)}...` : t.body}</span>
                    </td>
                    <td className="px-3 py-3 text-gray-700">{AUDIENCE_LABELS[t.audience]}s</td>
                    <td className="px-3 py-3">
                      {t.events.length === 0 ? (
                        <span className="text-xs text-gray-400">Not mapped to any status</span>
                      ) : (
                        <span className="flex max-w-[16rem] flex-wrap gap-1">
                          {t.events.map((e) => (
                            <span key={e} className="rounded bg-gray-100 px-1.5 py-0.5 text-[11px] text-gray-700">{eventLabel(e)}</span>
                          ))}
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-3">
                      <TemplateStatusPill status={t.status} />
                      {t.rejectedReason && <span className="mt-1 block max-w-[14rem] text-[11px] text-red-700">{t.rejectedReason}</span>}
                    </td>
                    <td className="px-3 py-3">
                      <button
                        type="button"
                        role="switch"
                        aria-checked={t.enabled}
                        aria-label={`${t.name} is ${t.enabled ? "on" : "off"}`}
                        onClick={() => toggle(t)}
                        disabled={busy !== null}
                        className={`relative h-5 w-9 rounded-full transition ${t.enabled ? "bg-brand" : "bg-gray-300"} disabled:opacity-60`}
                      >
                        <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all ${t.enabled ? "left-[1.1rem]" : "left-0.5"}`} />
                      </button>
                    </td>
                    <td className="px-3 py-3">
                      <span className="flex flex-wrap gap-x-3 gap-y-1">
                        <button type="button" onClick={() => setForm({ template: t })} className={link}>Edit</button>
                        {submittable && (
                          <button type="button" onClick={() => submit(t)} disabled={busy !== null || !metaReady} className={link}>
                            {busy === `submit-${t.id}` ? "Submitting..." : t.status === "REJECTED" ? "Resubmit" : "Submit to Meta"}
                          </button>
                        )}
                        {t.status === "APPROVED" && (
                          <button type="button" onClick={() => setTesting(t)} className={link}>Send test</button>
                        )}
                        <button type="button" onClick={() => setDeleting(t)} className="text-xs font-medium text-red-600 hover:underline">Delete</button>
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {form && <TemplateForm template={form.template} templates={templates} media={media} onClose={() => setForm(null)} onSaved={() => router.refresh()} />}
      {testing && <TestSend template={testing} onClose={() => setTesting(null)} />}
      {deleting && (
        <Modal title={`Delete ${deleting.name}?`} onClose={() => setDeleting(null)}>
          <p className="text-sm text-gray-700">
            {deleting.metaId ? "This also deletes it from Meta, so it can no longer be sent." : "This draft has not been sent to Meta."} Statuses mapped to it will send nothing until another template is mapped.
          </p>
          <div className="mt-4 flex gap-2">
            <button type="button" onClick={() => remove(deleting)} disabled={busy !== null} className="rounded-md bg-red-600 px-3 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60">
              {busy?.startsWith("delete") ? "Deleting..." : "Delete template"}
            </button>
            <button type="button" onClick={() => setDeleting(null)} className={quietButtonClass}>Cancel</button>
          </div>
        </Modal>
      )}
    </div>
  );
}

// Send an approved template, with sample values, to a phone.
function TestSend({ template, onClose }: { template: WaTemplate; onClose: () => void }) {
  const [to, setTo] = useState("");
  const [busy, setBusy] = useState(false);
  const { toast } = useToast();

  async function send(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const res = await sendJson<{ to: string }>(`/api/admin/whatsapp/templates/${template.id}/test`, "POST", { to });
    toast(res.ok ? { kind: "success", title: "Test message sent", message: `${template.name} went to +${res.data.to}.` } : { kind: "error", title: "Couldn't send the test", message: res.error });
    setBusy(false);
  }

  return (
    <Modal title={`Send a test of ${template.name}`} onClose={onClose}>
      <form onSubmit={send} className="flex flex-col gap-3">
        <label className="flex flex-col gap-1 text-xs font-medium text-gray-600">
          WhatsApp number
          <input value={to} onChange={(e) => setTo(e.target.value)} inputMode="tel" placeholder="98450 12345" className={inputClass} autoFocus />
        </label>
        <p className="text-xs text-gray-500">The message is filled with sample values (for example &ldquo;Priya&rdquo; and &ldquo;BK-M3X9K2&rdquo;). It goes to a real phone, so use your own number.</p>
        <div className="flex gap-2">
          <button type="submit" disabled={busy || to.replace(/\D/g, "").length < 10} className={buttonClass}>{busy ? "Sending..." : "Send test"}</button>
          <button type="button" onClick={onClose} className={quietButtonClass}>Close</button>
        </div>
      </form>
    </Modal>
  );
}
