"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

// "Delete" asks for a Confirm / Cancel before anything is removed.
export default function DeleteDoctorButton({ id, name }: { id: string; name: string }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function remove() {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/admin/doctors", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (res.ok) {
        router.refresh();
        return;
      }
      const data = await res.json().catch(() => ({}));
      setError(data.error || "Couldn't delete. Please try again.");
    } catch {
      setError("Couldn't reach the server. Please try again.");
    }
    setBusy(false);
  }

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="rounded-md border border-red-300 px-2.5 py-1 text-xs font-medium text-red-600 transition hover:bg-red-50"
      >
        Delete
      </button>
    );
  }

  return (
    <div role="alertdialog" aria-label={`Delete ${name}?`} className="flex flex-col gap-1.5 rounded-md border border-red-200 bg-red-50 p-2">
      <p className="text-xs text-red-800">
        Delete <strong>{name}</strong>? Their affiliate link will stop working.
      </p>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={remove}
          disabled={busy}
          className="rounded-md bg-red-600 px-2.5 py-1 text-xs font-medium text-white transition hover:bg-red-700 disabled:opacity-60"
        >
          {busy ? "Deleting..." : "Confirm"}
        </button>
        <button
          type="button"
          onClick={() => {
            setConfirming(false);
            setError("");
          }}
          disabled={busy}
          className="rounded-md border border-gray-300 bg-white px-2.5 py-1 text-xs font-medium text-gray-700 transition hover:bg-gray-50 disabled:opacity-60"
        >
          Cancel
        </button>
      </div>
      {error && <p role="alert" className="text-xs text-red-700">{error}</p>}
    </div>
  );
}
