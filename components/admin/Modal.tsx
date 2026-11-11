"use client";
import { useEffect } from "react";

// A dialog: dark backdrop, Escape or a click outside closes it. The dialog never grows taller than the
// window: its header stays put and its content scrolls, so a long form is fully reachable on any screen
// (centring a tall box in a scrolling backdrop would cut off its top).
export default function Modal({ title, onClose, children, wide = false }: { title: string; onClose: () => void; children: React.ReactNode; wide?: boolean }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    // The page behind must not scroll while the dialog is open.
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3 sm:p-6" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`flex max-h-full w-full ${wide ? "max-w-4xl" : "max-w-lg"} flex-col rounded-xl bg-white shadow-xl`}
      >
        <div className="flex shrink-0 items-center justify-between gap-3 border-b px-5 py-3">
          <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="rounded px-2 text-xl leading-none text-gray-500 hover:text-gray-900">&times;</button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">{children}</div>
      </div>
    </div>
  );
}
