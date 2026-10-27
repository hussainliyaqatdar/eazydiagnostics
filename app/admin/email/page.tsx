import type { Metadata } from "next";
import TestEmailButton from "@/components/TestEmailButton";
import { emailConfigStatus } from "@/lib/email";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Email delivery", robots: { index: false, follow: false } };

function Row({ label, ok, children }: { label: string; ok: boolean; children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-3 px-4 py-3">
      <span className={`mt-0.5 h-5 w-5 shrink-0 rounded-full text-center text-xs font-bold leading-5 text-white ${ok ? "bg-green-600" : "bg-red-500"}`} aria-hidden="true">
        {ok ? "✓" : "!"}
      </span>
      <div className="min-w-0">
        <p className="font-medium text-gray-900">{label}</p>
        <p className="break-words text-sm text-gray-600">{children}</p>
      </div>
    </li>
  );
}

export default function AdminEmailPage() {
  const s = emailConfigStatus();
  const ready = s.apiKeySet && !s.ownerIsPlaceholder && !s.fromIsPlaceholder;

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Email delivery</h1>
        <p className="text-sm text-gray-500">
          New orders and doctor registrations are emailed to the owner through Resend. This is the only place orders are announced, so check it works.
        </p>
      </div>

      <ul className="divide-y rounded-lg border bg-white">
        <Row label="RESEND_API_KEY" ok={s.apiKeySet}>
          {s.apiKeySet ? "Set." : "Not set - no emails are sent. Add your Resend API key to the server's environment."}
        </Row>
        <Row label="OWNER_EMAIL (who gets the order emails)" ok={!s.ownerIsPlaceholder}>
          {s.ownerIsPlaceholder ? `Placeholder (${s.ownerEmail}) - set OWNER_EMAIL to the real inbox.` : s.ownerEmail}
        </Row>
        <Row label="FROM_EMAIL (the sender)" ok={!s.fromIsPlaceholder}>
          {s.fromIsPlaceholder
            ? `Placeholder (${s.fromAddress}) - Resend rejects senders on domains you haven't verified. Use an address on your verified domain.`
            : s.fromAddress}
        </Row>
      </ul>

      <div className="flex flex-col gap-2">
        <h2 className="text-lg font-semibold text-gray-900">Send a test</h2>
        <p className="text-sm text-gray-600">
          Sends a real email to {s.ownerEmail} the same way order emails go out, and shows exactly what Resend answered.
          {!ready && " Fix the items above first."}
        </p>
        <TestEmailButton />
      </div>
    </div>
  );
}
