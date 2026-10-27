import { notFound } from "next/navigation";
import { readEmails } from "@/lib/store";

export const dynamic = "force-dynamic";

export default function InboxPage() {
  // The inbox holds copies of order emails (patient names, phones, addresses), and
  // the admin pages are not password-protected by default - so it is a
  // local-development tool only and does not exist in production.
  if (process.env.NODE_ENV === "production") notFound();
  const emails = readEmails().slice().reverse();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dev inbox</h1>
        <p className="text-sm text-gray-500">
          Emails render here because no RESEND_API_KEY is set yet - a stand-in for real delivery so you can verify
          the confirmation and owner-notification content before going live.
        </p>
      </div>
      {emails.length === 0 && <p className="text-gray-500">No emails sent yet. Complete a booking to see one here.</p>}
      <div className="flex flex-col gap-4">
        {emails.map((e) => (
          <div key={e.id} className="bg-white border rounded-lg overflow-hidden">
            <div className="bg-gray-50 px-4 py-2 text-sm flex justify-between border-b">
              <span><strong>To ({e.toLabel}):</strong> {e.to} &middot; <strong>Subject:</strong> {e.subject}</span>
              <span className="text-gray-400">{new Date(e.sentAt).toLocaleString()}</span>
            </div>
            <div className="p-4" dangerouslySetInnerHTML={{ __html: e.html }} />
          </div>
        ))}
      </div>
    </div>
  );
}
