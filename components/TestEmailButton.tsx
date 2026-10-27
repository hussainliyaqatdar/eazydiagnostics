"use client";
import { useState } from "react";

export default function TestEmailButton() {
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; detail: string } | null>(null);

  async function send() {
    setBusy(true);
    setResult(null);
    try {
      const res = await fetch("/api/admin/test-email", { method: "POST" });
      setResult(await res.json());
    } catch {
      setResult({ ok: false, detail: "Couldn't reach the server." });
    }
    setBusy(false);
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={send}
        disabled={busy}
        className="w-fit rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-dark disabled:opacity-60"
      >
        {busy ? "Sending..." : "Send test email"}
      </button>
      {result && (
        <p
          role="status"
          className={`rounded-lg border px-3 py-2 text-sm break-words ${result.ok ? "border-green-200 bg-green-50 text-green-800" : "border-red-200 bg-red-50 text-red-800"}`}
        >
          {result.ok ? `${result.detail} Check the inbox (and spam).` : result.detail}
        </p>
      )}
    </div>
  );
}
