"use client";
import { useEffect, useRef, useState } from "react";
import Modal from "./Modal";
import { buttonClass, quietButtonClass } from "./api";
import { useToast } from "./Toaster";
import { drawStandee, isLocalLink, standeeFileName, STANDEE_CTA } from "@/lib/qr-standee";

type Props = { doctorName: string; clinicName: string; link: string; logoUrl?: string | null };

// "QR standee": generates the doctor's reception-desk graphic (QR code for their affiliate link, the call to
// action, clinic and doctor names) in a dialog, to download as a PNG or print.
export default function QrStandeeButton({ doctorName, clinicName, link, logoUrl }: Props) {
  const [open, setOpen] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [ready, setReady] = useState(false);
  const { toast } = useToast();
  const local = isLocalLink(link);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setReady(false);
    // The canvas exists once the dialog has rendered.
    const t = setTimeout(async () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      try {
        await drawStandee(canvas, { link, clinicName, doctorName, logoUrl });
        if (!cancelled) setReady(true);
      } catch (err) {
        if (!cancelled) toast({ kind: "error", title: "Couldn't generate the QR standee", message: err instanceof Error ? err.message : "Please try again." });
      }
    }, 0);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [open, link, clinicName, doctorName, logoUrl, toast]);

  function download() {
    canvasRef.current?.toBlob((blob) => {
      if (!blob) {
        toast({ kind: "error", title: "Couldn't create the image" });
        return;
      }
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = standeeFileName(doctorName);
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      toast({ kind: "success", title: "QR standee downloaded", message: a.download });
    }, "image/png");
  }

  // Prints just the graphic, fitted to one A4 page, through a hidden frame.
  function print() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const frame = document.createElement("iframe");
    frame.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0";
    document.body.appendChild(frame);
    const doc = frame.contentDocument;
    if (!doc) return;
    doc.open();
    doc.write(
      `<!doctype html><html><head><title>${standeeFileName(doctorName)}</title><style>@page{size:A4 portrait;margin:0}html,body{margin:0;height:100%}img{display:block;width:210mm;height:297mm;object-fit:contain}</style></head><body><img src="${canvas.toDataURL("image/png")}" alt=""></body></html>`
    );
    doc.close();
    const img = doc.querySelector("img");
    const go = () => {
      frame.contentWindow?.focus();
      frame.contentWindow?.print();
      setTimeout(() => frame.remove(), 2000);
    };
    if (img && !img.complete) img.onload = go;
    else go();
  }

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="shrink-0 rounded-md border border-gray-300 px-2.5 py-1 text-xs font-medium text-gray-700 transition hover:border-brand hover:text-brand">
        QR standee
      </button>
      {open && (
        <Modal title={`QR standee - ${doctorName}`} onClose={() => setOpen(false)} wide>
          <div className="flex flex-col gap-5 md:flex-row">
            <div className="flex shrink-0 justify-center md:w-[19rem]">
              <canvas
                ref={canvasRef}
                aria-label={`QR standee for ${doctorName} at ${clinicName}`}
                className="h-auto max-h-[62vh] w-auto max-w-full rounded-lg border bg-white shadow-sm"
              />
            </div>
            <div className="flex min-w-0 flex-1 flex-col gap-3 text-sm">
              <p className="text-gray-700">
                A reception-desk graphic: the clinic&apos;s and doctor&apos;s names in the banner, a QR code that opens {doctorName}&apos;s affiliate booking link, and &ldquo;{STANDEE_CTA}&rdquo; beneath it.
              </p>
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={download} disabled={!ready} className={buttonClass}>Download PNG</button>
                <button type="button" onClick={print} disabled={!ready} className={quietButtonClass}>Print</button>
              </div>
              <p className="text-xs text-gray-500">1200 &times; 1800 px, sized for a 4 &times; 6 in standee or an A4 print.</p>
              <div className="flex flex-col gap-1 rounded-md bg-gray-50 p-3">
                <span className="text-xs font-medium text-gray-600">The QR code opens</span>
                <a href={link} target="_blank" rel="noopener noreferrer" className="break-all font-mono text-xs text-brand hover:underline">{link}</a>
              </div>
              {local && (
                <p role="alert" className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                  This link points at your own computer (localhost), so patients cannot open it. Set <code>SITE_URL</code> to the public address on the server before printing.
                </p>
              )}
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}
