import { BOOKING_PHONE, WHATSAPP_NUMBER } from "@/lib/site-config";

// Shown when a search finds nothing: instead of a dead end, the visitor is sent to WhatsApp to chat with
// Support and schedule their order (for example a test the site does not list, like "Rhinitis").
export function supportWhatsAppUrl(query?: string): string {
  const q = query?.trim().slice(0, 80);
  const text = q
    ? `Hi, I could not find "${q}" on your website. I'd like to schedule a home collection - can you help me find the right test?`
    : "Hi, I could not find my test on your website. I'd like to schedule a home collection - can you help me?";
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(text)}`;
}

const WhatsAppIcon = () => (
  <svg viewBox="0 0 24 24" className="h-5 w-5 shrink-0" fill="currentColor" aria-hidden="true">
    <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.46 1.32 4.96L2.05 22l5.25-1.38a9.87 9.87 0 0 0 4.74 1.21h.01c5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2Zm0 18.15h-.01a8.2 8.2 0 0 1-4.18-1.14l-.3-.18-3.12.82.83-3.04-.2-.31a8.21 8.21 0 0 1-1.26-4.39c0-4.54 3.7-8.24 8.25-8.24 2.2 0 4.27.86 5.83 2.42a8.18 8.18 0 0 1 2.41 5.83c0 4.55-3.7 8.23-8.25 8.23Zm4.52-6.16c-.25-.12-1.47-.72-1.69-.81-.23-.08-.39-.12-.56.13-.16.24-.64.81-.79.97-.14.17-.29.19-.54.06-.25-.12-1.04-.38-1.99-1.22a7.47 7.47 0 0 1-1.38-1.71c-.14-.25-.02-.38.11-.51.11-.11.25-.29.37-.43.12-.15.16-.25.24-.41.08-.17.04-.31-.02-.43-.06-.12-.56-1.35-.77-1.85-.2-.48-.41-.42-.56-.43-.14-.01-.31-.01-.48-.01-.16 0-.43.06-.66.31-.23.24-.86.85-.86 2.06 0 1.22.88 2.4 1.01 2.56.12.17 1.74 2.66 4.22 3.73.59.25 1.05.4 1.41.52.59.19 1.13.16 1.55.1.47-.07 1.47-.6 1.68-1.19.21-.58.21-1.08.15-1.19-.06-.1-.23-.16-.48-.28Z" />
  </svg>
);

export default function NoResultsSupport({ query, compact = false }: { query?: string; compact?: boolean }) {
  return (
    <div role="status" className={`flex flex-col items-center gap-3 rounded-xl border bg-white text-center ${compact ? "px-4 py-6" : "px-6 py-10"}`}>
      <p className="text-base font-semibold text-gray-900">Unable to find your tests.</p>
      {query && <p className="max-w-md text-sm text-gray-500">We couldn&apos;t find anything for &ldquo;{query}&rdquo;.</p>}
      <a
        href={supportWhatsAppUrl(query)}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-2 rounded-lg bg-[#25D366] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:brightness-95"
      >
        <WhatsAppIcon />
        Talk to Support
      </a>
      <p className="max-w-md text-xs text-gray-500">
        Chat with our team on WhatsApp ({BOOKING_PHONE}) and they will help you find the right test and schedule your order.
      </p>
    </div>
  );
}
