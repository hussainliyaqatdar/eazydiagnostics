import type { Metadata } from "next";
import Tabs from "@/components/admin/Tabs";
import ConnectionCard from "@/components/admin/whatsapp/ConnectionCard";
import MessageLog from "@/components/admin/whatsapp/MessageLog";
import TemplatesPanel from "@/components/admin/whatsapp/TemplatesPanel";
import CoverageGrid, { type CoverageRow } from "@/components/admin/whatsapp/CoverageGrid";
import TemplateStatusPill from "@/components/admin/whatsapp/TemplateStatusPill";
import { SITE_URL } from "@/lib/site-config";
import { whatsappConfigStatus } from "@/lib/whatsapp";
import { recentMessages, type MessageRow } from "@/lib/whatsapp-log";
import { listMedia, type MediaItem } from "@/lib/whatsapp-media";
import ImageLibrary from "@/components/admin/whatsapp/ImageLibrary";
import { AUDIENCE_LABELS, EVENTS } from "@/lib/whatsapp-events";
import { listTemplates, type WaTemplate } from "@/lib/whatsapp-templates";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "WhatsApp", robots: { index: false, follow: false } };

export default async function AdminWhatsappPage() {
  let templates: WaTemplate[] = [];
  let messages: MessageRow[] = [];
  let media: MediaItem[] = [];
  let loadError = "";
  try {
    [templates, messages, media] = await Promise.all([listTemplates(), recentMessages(), listMedia()]);
  } catch (err) {
    console.error("Admin: WhatsApp data could not be loaded:", err);
    loadError = `Couldn't load WhatsApp data: ${err instanceof Error ? err.message : "unknown error"}`;
  }
  const config = whatsappConfigStatus();
  const sendReady = config.tokenSet && config.phoneNumberIdSet;
  const metaReady = config.tokenSet && config.businessAccountIdSet;

  // Which template handles each event for each audience (a switched-on one); none means nothing is sent.
  const live = (event: string, audience: "patient" | "doctor") => templates.find((t) => t.enabled && t.audience === audience && t.events.includes(event));

  const coverageRows: CoverageRow[] = EVENTS.map((ev) => {
    const cell = (a: "patient" | "doctor") => {
      const t = live(ev.key, a);
      return t ? { id: t.id, status: t.status } : null;
    };
    return { key: ev.key, cells: { patient: cell("patient"), doctor: cell("doctor") } };
  });
  const coverage = (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-gray-600">
        Choose which existing template is sent for each change, for patients and for doctors. A change with no template mapped sends no WhatsApp message (you are told on Orders when that happens), and neither does one whose template is not approved yet. New templates are written on the Templates tab.
      </p>
      <CoverageGrid rows={coverageRows} templates={templates} />
    </div>
  );

  const failed = messages.filter((m) => m.delivery === "failed").length;

  return (
    <div className="flex max-w-6xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">WhatsApp</h1>
        <p className="text-sm text-gray-500">
          Templates, which template is sent for each status change, and every message that went out. Patients and prescribing doctors are messaged when a visit, payment or report status changes on{" "}
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
          { id: "templates", label: `Templates (${templates.length})`, content: <TemplatesPanel templates={templates} media={media} metaReady={metaReady} /> },
          { id: "coverage", label: "Template - Status Mapping", content: coverage },
          { id: "images", label: `Images (${media.length})`, content: <ImageLibrary media={media} /> },
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
