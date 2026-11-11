"use client";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";

// Toast notifications for the admin pages: they stack at the top right, stay for 10 seconds (the timer
// pauses while the pointer is over a toast) and can be closed early. Used instead of notices inside the
// component that triggered the action, so a result stays visible even if that component re-renders or the
// page refreshes.
export const TOAST_MS = 10_000;

export type ToastKind = "success" | "error" | "warning" | "info";
export type ToastLine = { ok?: boolean; text: string };
export type ToastInput = { kind: ToastKind; title?: string; message?: string; lines?: ToastLine[] };
type Toast = ToastInput & { id: number };

type Api = { toast: (t: ToastInput) => void };
const noop: Api = { toast: () => {} };
const ToastContext = createContext<Api>(noop);

export const useToast = () => useContext(ToastContext);

const TONES: Record<ToastKind, { box: string; bar: string; icon: string; label: string }> = {
  success: { box: "border-green-200 bg-green-50 text-green-900", bar: "bg-green-500", icon: "✓", label: "Success" },
  error: { box: "border-red-200 bg-red-50 text-red-900", bar: "bg-red-500", icon: "✕", label: "Error" },
  warning: { box: "border-amber-200 bg-amber-50 text-amber-900", bar: "bg-amber-500", icon: "!", label: "Notice" },
  info: { box: "border-blue-200 bg-blue-50 text-blue-900", bar: "bg-blue-500", icon: "i", label: "Info" },
};

function ToastCard({ t, onDone }: { t: Toast; onDone: (id: number) => void }) {
  const tone = TONES[t.kind];
  const remaining = useRef(TOAST_MS);
  const startedAt = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout>>();
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused) return;
    startedAt.current = Date.now();
    timer.current = setTimeout(() => onDone(t.id), remaining.current);
    return () => {
      clearTimeout(timer.current);
      remaining.current -= Date.now() - startedAt.current;
    };
  }, [paused, t.id, onDone]);

  return (
    <div
      role={t.kind === "error" ? "alert" : "status"}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      className={`pointer-events-auto relative w-full overflow-hidden rounded-lg border shadow-lg ${tone.box}`}
    >
      <div className="flex items-start gap-3 px-3 py-2.5">
        <span aria-hidden="true" className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white ${tone.bar}`}>{tone.icon}</span>
        <div className="min-w-0 flex-1 text-sm">
          {t.title && <p className="font-semibold">{t.title}</p>}
          {t.message && <p className={t.title ? "mt-0.5" : ""}>{t.message}</p>}
          {t.lines && t.lines.length > 0 && (
            <ul className="mt-1 flex flex-col gap-0.5 text-xs">
              {t.lines.map((l, i) => (
                <li key={i} className={l.ok === false ? "text-red-700" : l.ok ? "text-green-800" : "opacity-80"}>
                  {l.ok === true ? "✓ " : l.ok === false ? "✗ " : "• "}
                  {l.text}
                </li>
              ))}
            </ul>
          )}
        </div>
        <button type="button" onClick={() => onDone(t.id)} aria-label="Dismiss" className="rounded px-1 text-lg leading-none opacity-60 hover:opacity-100">&times;</button>
      </div>
      {/* Time left. */}
      <div className="h-1 w-full bg-black/5" aria-hidden="true">
        <div className={`h-full ${tone.bar}`} style={{ animation: `toast-shrink ${TOAST_MS}ms linear forwards`, animationPlayState: paused ? "paused" : "running" }} />
      </div>
    </div>
  );
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const next = useRef(1);

  const dismiss = useCallback((id: number) => setToasts((cur) => cur.filter((t) => t.id !== id)), []);
  const toast = useCallback((t: ToastInput) => {
    const id = next.current++;
    // At most five at once: the oldest makes way.
    setToasts((cur) => [...cur.slice(-4), { ...t, id }]);
  }, []);
  const api = useMemo(() => ({ toast }), [toast]);

  return (
    <ToastContext.Provider value={api}>
      {children}
      <style>{"@keyframes toast-shrink { from { width: 100%; } to { width: 0%; } }"}</style>
      <div aria-live="polite" className="pointer-events-none fixed right-3 top-3 z-[60] flex w-[min(24rem,calc(100vw-1.5rem))] flex-col gap-2 sm:right-4 sm:top-4">
        {toasts.map((t) => (
          <ToastCard key={t.id} t={t} onDone={dismiss} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}
