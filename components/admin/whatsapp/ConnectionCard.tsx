"use client";
import { useState } from "react";
import { buttonClass, sendJson } from "../api";
import { useToast } from "../Toaster";

type Config = { tokenSet: boolean; phoneNumberIdSet: boolean; businessAccountIdSet: boolean; verifyTokenSet: boolean; appSecretSet: boolean };

// What is configured, whether Meta accepts it, and what to enter in Meta's dashboard for the webhook.
export default function ConnectionCard({ config, webhookUrl }: { config: Config; webhookUrl: string }) {
  const [busy, setBusy] = useState(false);
  const { toast } = useToast();

  async function test() {
    setBusy(true);
    const res = await sendJson<{ ok: boolean; phone?: { display_phone_number?: string; verified_name?: string; quality_rating?: string }; error?: string }>("/api/admin/whatsapp/connection", "POST", {});
    if (!res.ok) toast({ kind: "error", title: "Connection check failed", message: res.error });
    else if (res.data.ok) {
      const p = res.data.phone ?? {};
      toast({ kind: "success", title: "Connected to WhatsApp", message: `${p.verified_name ?? "Your number"} (${p.display_phone_number ?? "number"})${p.quality_rating ? ` - quality ${p.quality_rating.toLowerCase()}` : ""}.` });
    } else toast({ kind: "error", title: "Meta did not accept the connection", message: res.data.error ?? "Check the settings above." });
    setBusy(false);
  }

  const rows: { env: string; set: boolean; what: string; needed: string }[] = [
    { env: "WHATSAPP_ACCESS_TOKEN", set: config.tokenSet, what: "Permanent access token (System User)", needed: "Sending and template management" },
    { env: "WHATSAPP_PHONE_NUMBER_ID", set: config.phoneNumberIdSet, what: "The number messages go out from", needed: "Sending" },
    { env: "WHATSAPP_BUSINESS_ACCOUNT_ID", set: config.businessAccountIdSet, what: "WhatsApp Business Account id", needed: "Creating, syncing and deleting templates" },
    { env: "WHATSAPP_WEBHOOK_VERIFY_TOKEN", set: config.verifyTokenSet, what: "A secret you choose, entered in Meta's webhook setup", needed: "Delivery receipts and approval alerts" },
    { env: "WHATSAPP_APP_SECRET", set: config.appSecretSet, what: "The Meta app's secret", needed: "Checking that webhook calls really come from Meta" },
  ];

  return (
    <div className="flex flex-col gap-5">
      <div className="overflow-x-auto rounded-lg border bg-white">
        <table className="w-full min-w-[40rem] text-left text-sm">
          <thead className="border-b bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
            <tr>
              <th className="px-3 py-2 font-semibold">Setting</th>
              <th className="px-3 py-2 font-semibold">State</th>
              <th className="px-3 py-2 font-semibold">What it is</th>
              <th className="px-3 py-2 font-semibold">Needed for</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {rows.map((r) => (
              <tr key={r.env}>
                <td className="px-3 py-2.5 font-mono text-xs text-gray-800">{r.env}</td>
                <td className="px-3 py-2.5">
                  <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold ring-1 ring-inset ${r.set ? "bg-green-50 text-green-800 ring-green-300" : "bg-red-50 text-red-800 ring-red-300"}`}>{r.set ? "Set" : "Missing"}</span>
                </td>
                <td className="px-3 py-2.5 text-gray-700">{r.what}</td>
                <td className="px-3 py-2.5 text-gray-500">{r.needed}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="-mt-3 text-xs text-gray-500">These are set on the server (Render &rarr; Environment), not here, so the secrets never pass through the browser.</p>

      <div className="flex flex-col gap-2 rounded-lg border bg-white p-4">
        <h3 className="text-sm font-semibold text-gray-900">Check the connection</h3>
        <div>
          <button type="button" onClick={test} disabled={busy} className={buttonClass}>{busy ? "Checking..." : "Test connection"}</button>
        </div>
      </div>

      <div className="flex flex-col gap-2 rounded-lg border bg-white p-4 text-sm text-gray-700">
        <h3 className="text-sm font-semibold text-gray-900">Webhook (live delivery status and approvals)</h3>
        <p>In Meta&apos;s App dashboard &rarr; WhatsApp &rarr; Configuration, set:</p>
        <dl className="grid gap-1 text-xs sm:grid-cols-[9rem_1fr]">
          <dt className="font-medium text-gray-500">Callback URL</dt>
          <dd><code className="break-all rounded bg-gray-100 px-1.5 py-0.5">{webhookUrl}</code></dd>
          <dt className="font-medium text-gray-500">Verify token</dt>
          <dd>the value of <code className="rounded bg-gray-100 px-1.5 py-0.5">WHATSAPP_WEBHOOK_VERIFY_TOKEN</code></dd>
          <dt className="font-medium text-gray-500">Subscribe to</dt>
          <dd><code className="rounded bg-gray-100 px-1.5 py-0.5">messages</code> and <code className="rounded bg-gray-100 px-1.5 py-0.5">message_template_status_update</code></dd>
        </dl>
        <p className="text-xs text-gray-500">Once connected, the message log shows Sent, Delivered and Read as WhatsApp reports them, and templates flip to Approved or Rejected without a manual sync.</p>
      </div>
    </div>
  );
}
