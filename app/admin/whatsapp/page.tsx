import type { Metadata } from "next";
import Tabs from "@/components/admin/Tabs";
import ConnectionCard from "@/components/admin/whatsapp/ConnectionCard";
import MessageLog from "@/components/admin/whatsapp/MessageLog";
import TemplatesPanel from "@/components/admin/whatsapp/TemplatesPanel";
import TemplateStatusPill from "@/components/admin/whatsapp/TemplateStatusPill";
import { SITE_URL } from "@/lib/site-config";
import { whatsappConfigStatus } from "@/lib/whatsapp";
import { recentMessages, type MessageRow } from "@/lib/whatsapp-log";
import { AUDIENCE_LABELS, AUDIENCES, EVENTS } from "@/lib/whatsapp-events";
import { listTemplates, type WaTemplate } from "@/lib/whatsapp-templates";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "WhatsApp", robots: { index: false, follow: false } };

export default async function AdminWhatsappPage() {
  let templates: WaTemplate[] = [];
  let messages: MessageRow[] = [];
  let loadError = "";
  try {
    [templates, messages] = await Promise.all([listTemplates(), recentMessages()]);
  } catch (err) {
    console.error("Admin: WhatsApp data could not be loaded:", err);
    loadError = `Couldn't load WhatsApp data: ${err instanceof Error ? err.message : "unknown error"}`;
  }
  const config = whatsappConfigStatus();
  const sendReady = config.tokenSet && config.phoneNumberIdSet;
  const metaReady = config.tokenSet && config.businessAccountIdSet;

  // Which template handles each event for each audience (an approved, switched-on one), else the generic update.
  const live = (event: string, audience: "patient" | "doctor") => templates.find((t) => t.enabled && t.audience === audience && t.events.includes(event));

  const coverage = (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-gray-600">
        What gets sent for each change. An event whose template is not approved yet, or has none, uses the generic update template ({config.patientTemplate} / {config.doctorTemplate}).
      </p>
      <div className="flex flex-col gap-2 rounded-lg border bg-white p-4">
        <h3 className="text-sm font-semibold text-gray-900">Generic update templates</h3>
        <p className="text-xs text-gray-500">The fallback for any event without a template of its own. Create each in Templates, with the exact name below, and send it to Meta.</p>
        <ul className="grid gap-2 sm:grid-cols-2">
          {([["patient", config.patientTemplate], ["doctor", config.doctorTemplate]] as const).map(([a, name]) => {
            const t = templates.find((x) => x.name === name);
            return (
              <li key={a} className="flex flex-wrap items-center gap-2 text-sm">
                <span className="w-14 text-xs text-gray-500">{AUDIENCE_LABELS[a]}</span>
                <span className="font-mono text-xs text-gray-800">{name}</span>
                {t ? <TemplateStatusPill status={t.status} /> : <span className="text-xs text-red-700">Not created</span>}
              </li>
            );
          })}
        </ul>
      </div>
      <div className="overflow-x-auto rounded-lg border bg-white">
        <table className="w-full min-w-[40rem] text-left text-sm">
          <thead className="border-b bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
            <tr>
              <th className="px-3 py-2 font-semibold">Event</th>
              {AUDIENCES.map((a) => (
                <th key={a} className="px-3 py-2 font-semibold">{AUDIENCE_LABELS[a]}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y">
            {EVENTS.map((ev) => (
              <tr key={ev.key}>
                <td className="px-3 py-2.5">
                  <span className="font-medium text-gray-900">{ev.label}</span>
                  <span className="block text-xs text-gray-500">{ev.group}</span>
                </td>
                {AUDIENCES.map((a) => {
                  if (!ev.audiences.includes(a)) return <td key={a} className="px-3 py-2.5 text-xs text-gray-300">Not sent</td>;
                  const t = live(ev.key, a);
                  return (
                    <td key={a} className="px-3 py-2.5">
                      {t ? (
                        <span className="flex flex-wrap items-center gap-2">
                          <span className="font-mono text-xs text-gray-800">{t.name}</span>
                          <TemplateStatusPill status={t.status} />
                          {t.status !== "APPROVED" && <span className="text-[11px] text-gray-500">generic used until approved</span>}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-500">Generic update template</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const failed = messages.filter((m) => m.delivery === "failed").length;

  return (
    <div className="flex max-w-6xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">WhatsApp</h1>
        <p className="text-sm text-gray-500">
          Templates, what is sent for each change, and every message that went out. Patients and prescribing doctors are messaged when a visit, payment or report status changes on{" "}
          <a href="/admin/orders" className="text-brand hover:underline">Orders</a>.
        </p>
      </div>

      {!sendReady && (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          WhatsApp is not connected yet, so no messages are sent. See the Connection tab.
        </p>
      )}
      {loadError && <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{loadError}</p>}

      <Tabs
        label="WhatsApp"
        tabs={[
          { id: "templates", label: `Templates (${templates.length})`, content: <TemplatesPanel templates={templates} metaReady={metaReady} /> },
          { id: "coverage", label: "What is sent", content: coverage },
          {
            id: "log",
            label: `Message log (${messages.length})`,
            badge: failed > 0 ? <span className="rounded bg-red-100 px-1.5 py-0.5 text-[10px] font-semibold text-red-800">{failed} failed</span> : undefined,
            content: <MessageLog rows={messages} />,
          },
          { id: "connection", label: "Connection", content: <ConnectionCard config={config} webhookUrl={`${SITE_URL.replace(/\/$/, "")}/api/whatsapp/webhook`} /> },
        ]}
      />
    </div>
  );
}
