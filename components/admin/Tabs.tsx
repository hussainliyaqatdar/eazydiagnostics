"use client";
import { useState } from "react";

export type TabItem = { id: string; label: string; badge?: React.ReactNode; content: React.ReactNode };

// A row of tabs with the selected one's content beneath it. The content is rendered on the server and
// passed in, so each tab can hold interactive client components.
export default function Tabs({ tabs, label }: { tabs: TabItem[]; label: string }) {
  const [active, setActive] = useState(tabs[0]?.id ?? "");
  const current = tabs.find((t) => t.id === active) ?? tabs[0];
  if (!current) return null;

  return (
    <div className="flex flex-col gap-3">
      <div role="tablist" aria-label={label} className="flex flex-wrap gap-1 border-b">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={t.id === current.id}
            onClick={() => setActive(t.id)}
            className={`-mb-px flex items-center gap-2 rounded-t-md border px-3 py-2 text-sm font-medium ${t.id === current.id ? "border-b-white bg-white text-brand" : "border-transparent text-gray-600 hover:text-brand"}`}
          >
            {t.label}
            {t.badge}
          </button>
        ))}
      </div>
      <div role="tabpanel">{current.content}</div>
    </div>
  );
}
