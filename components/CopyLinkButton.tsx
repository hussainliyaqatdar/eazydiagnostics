"use client";
import { useState } from "react";

export default function CopyLinkButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        } catch {
          // Clipboard blocked - the link is still shown and can be selected by hand.
        }
      }}
      className="shrink-0 rounded-md border border-brand px-2.5 py-1 text-xs font-medium text-brand-dark transition hover:bg-brand hover:text-white"
    >
      {copied ? "Copied" : "Copy link"}
    </button>
  );
}
