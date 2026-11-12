"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { buttonClass, sendForm, sendJson } from "../api";
import { useToast } from "../Toaster";
import type { MediaItem } from "@/lib/whatsapp-media";

const kb = (n: number) => (n >= 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`);

// The images that can be a template's header (for example a payment QR code): upload once, pick in the
// template form. An image in use by a template cannot be deleted.
export default function ImageLibrary({ media }: { media: MediaItem[] }) {
  const router = useRouter();
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState<number | "upload" | null>(null);

  async function upload(file: File | undefined) {
    if (!file) return;
    setBusy("upload");
    const form = new FormData();
    form.append("file", file);
    const res = await sendForm("/api/admin/whatsapp/media", form);
    toast(res.ok ? { kind: "success", title: "Image uploaded", message: file.name } : { kind: "error", title: "Couldn't upload the image", message: res.error });
    if (fileRef.current) fileRef.current.value = "";
    setBusy(null);
    router.refresh();
  }

  async function remove(m: MediaItem) {
    setBusy(m.id);
    const res = await sendJson(`/api/admin/whatsapp/media/${m.id}`, "DELETE");
    toast(res.ok ? { kind: "success", title: "Image deleted", message: m.name } : { kind: "error", title: "Couldn't delete the image", message: res.error });
    setBusy(null);
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="max-w-xl text-sm text-gray-600">
          Images to attach to a template, such as a payment QR code. Upload one here (or from a template), then choose it as the template&apos;s header image. JPEG or PNG, up to 5 MB.
        </p>
        <div>
          <input ref={fileRef} type="file" accept="image/png,image/jpeg" className="hidden" onChange={(e) => upload(e.target.files?.[0])} aria-label="Upload an image" />
          <button type="button" onClick={() => fileRef.current?.click()} disabled={busy !== null} className={buttonClass}>
            {busy === "upload" ? "Uploading..." : "+ Upload image"}
          </button>
        </div>
      </div>

      {media.length === 0 ? (
        <p className="rounded-lg border bg-white px-4 py-8 text-center text-sm text-gray-500">No images yet.</p>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {media.map((m) => (
            <li key={m.id} className="flex gap-3 rounded-lg border bg-white p-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`/api/admin/whatsapp/media/${m.id}`} alt={m.name} className="h-24 w-24 shrink-0 rounded-md border bg-gray-50 object-contain" />
              <div className="flex min-w-0 flex-1 flex-col gap-1 text-sm">
                <span className="truncate font-medium text-gray-900" title={m.name}>{m.name}</span>
                <span className="text-xs text-gray-500">{m.contentType === "image/png" ? "PNG" : "JPEG"} &middot; {kb(m.size)}</span>
                <span className="text-xs text-gray-600">{m.usedBy.length > 0 ? `Used by ${m.usedBy.join(", ")}` : "Not used by any template"}</span>
                <button
                  type="button"
                  onClick={() => remove(m)}
                  disabled={busy !== null || m.usedBy.length > 0}
                  title={m.usedBy.length > 0 ? "Change the template's header image first" : ""}
                  className="mt-auto self-start text-xs font-medium text-red-600 hover:underline disabled:text-gray-400 disabled:no-underline"
                >
                  {busy === m.id ? "Deleting..." : "Delete"}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
