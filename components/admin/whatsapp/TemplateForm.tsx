"use client";
import { useMemo, useRef, useState } from "react";
import Modal from "../Modal";
import { buttonClass, inputClass, labelClass, quietButtonClass, sendJson } from "../api";
import type { WaTemplate } from "@/lib/whatsapp-templates";
import {
  AUDIENCES,
  AUDIENCE_LABELS,
  CATEGORIES,
  EVENTS,
  LANGUAGES,
  LIMITS,
  VARIABLE_SOURCES,
  renderExample,
  validateTemplate,
  variableCount,
  type Audience,
  type TemplateCategory,
  type VariableSource,
} from "@/lib/whatsapp-events";

type Props = {
  // The template being edited, or null to write a new one.
  template: WaTemplate | null;
  // Events already handled by another switched-on template, keyed "audience:event" -> its name.
  taken: Record<string, string>;
  onClose: () => void;
  onSaved: () => void;
};

// Write or edit a template: its wording with {{variables}}, what fills each variable, who receives it and
// for which events. A live preview shows it as the recipient would read it.
export default function TemplateForm({ template, taken, onClose, onSaved }: Props) {
  const editing = !!template;
  const [name, setName] = useState(template?.name ?? "");
  const [language, setLanguage] = useState(template?.language ?? "en");
  const [category, setCategory] = useState<TemplateCategory>(template?.category ?? "UTILITY");
  const [audience, setAudience] = useState<Audience>(template?.audience ?? "patient");
  const [events, setEvents] = useState<string[]>(template?.events ?? []);
  const [body, setBody] = useState(template?.body ?? "");
  const [footer, setFooter] = useState(template?.footer ?? "");
  const [vars, setVars] = useState<(VariableSource | "")[]>(template?.variables ?? []);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [touched, setTouched] = useState(false);
  const bodyRef = useRef<HTMLTextAreaElement>(null);

  // Wording is locked while Meta is reviewing it.
  const locked = template?.status === "PENDING";
  const sent = !!template?.metaId;
  const count = variableCount(body);
  const sources: (VariableSource | "")[] = useMemo(() => Array.from({ length: count }, (_, i) => vars[i] ?? ""), [count, vars]);

  const errors = validateTemplate({ name, language, category, audience, events, body, footer, variables: sources as VariableSource[] }, true);
  const draftErrors = validateTemplate({ name, language, category, audience, events, body, footer, variables: sources as VariableSource[] }, false);

  function insertVariable(source: VariableSource) {
    const next = count + 1;
    const el = bodyRef.current;
    const at = el?.selectionStart ?? body.length;
    const end = el?.selectionEnd ?? at;
    const token = `{{${next}}}`;
    setBody(`${body.slice(0, at)}${token}${body.slice(end)}`);
    setVars([...sources.slice(0, count), source]);
    // Put the cursor right after the variable so typing carries on from there.
    requestAnimationFrame(() => {
      el?.focus();
      el?.setSelectionRange(at + token.length, at + token.length);
    });
  }

  function toggleEvent(key: string) {
    setEvents((cur) => (cur.includes(key) ? cur.filter((e) => e !== key) : [...cur, key]));
  }

  function changeAudience(a: Audience) {
    setAudience(a);
    // Events this audience is never sent are dropped.
    setEvents((cur) => cur.filter((k) => EVENTS.find((e) => e.key === k)?.audiences.includes(a)));
  }

  async function save(submit: boolean) {
    setTouched(true);
    const errs = submit ? errors : draftErrors;
    if (Object.values(errs).some(Boolean)) return;
    setBusy(true);
    setError("");
    const payload = { name, language, category, audience, events, body, footer, variables: sources, submit };
    const res = editing
      ? await sendJson<{ submitError?: string }>(`/api/admin/whatsapp/templates/${template!.id}`, "PATCH", payload)
      : await sendJson<{ submitError?: string }>("/api/admin/whatsapp/templates", "POST", payload);
    if (!res.ok) {
      setError(res.error);
      setBusy(false);
      return;
    }
    if (res.data.submitError) {
      // Saved, but Meta turned it down: keep the form open so it can be fixed.
      setError(`Saved, but Meta did not accept it: ${res.data.submitError}`);
      setBusy(false);
      onSaved();
      return;
    }
    onSaved();
    onClose();
  }

  const show = (msg?: string) => (touched && msg ? <span role="alert" className="text-xs font-normal text-red-600">{msg}</span> : null);
  const preview = renderExample(body, sources) || "Your message will appear here.";
  const wordingChanged = editing && (body.trim() !== template!.body || footer.trim() !== template!.footer || category !== template!.category);

  return (
    <Modal title={editing ? `Edit ${template!.name}` : "New WhatsApp template"} onClose={onClose} wide>
      <div className="grid gap-5 md:grid-cols-[1fr_17rem]">
        <div className="flex flex-col gap-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className={labelClass}>
              Template name*
              <input value={name} onChange={(e) => setName(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "_"))} disabled={editing} maxLength={LIMITS.name} placeholder="visit_update_patient" className={`${inputClass} font-mono`} />
              {show(errors.name)}
            </label>
            <label className={labelClass}>
              Language
              <select value={language} onChange={(e) => setLanguage(e.target.value)} disabled={editing} className={inputClass}>
                {LANGUAGES.map((l) => (
                  <option key={l.code} value={l.code}>{l.label}</option>
                ))}
              </select>
            </label>
            <label className={labelClass}>
              Category
              <select value={category} onChange={(e) => setCategory(e.target.value as TemplateCategory)} disabled={locked || (editing && sent)} className={inputClass}>
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c === "UTILITY" ? "Utility (order and visit updates)" : "Marketing"}</option>
                ))}
              </select>
            </label>
            <label className={labelClass}>
              Sent to
              <select value={audience} onChange={(e) => changeAudience(e.target.value as Audience)} className={inputClass}>
                {AUDIENCES.map((a) => (
                  <option key={a} value={a}>{AUDIENCE_LABELS[a]}s</option>
                ))}
              </select>
            </label>
          </div>

          <label className={labelClass}>
            <span className="flex flex-wrap items-center justify-between gap-2">
              <span>Message*</span>
              <select
                aria-label="Insert a variable"
                value=""
                onChange={(e) => e.target.value && insertVariable(e.target.value as VariableSource)}
                disabled={locked}
                className="rounded-md border border-gray-300 bg-white px-2 py-1 text-xs font-normal"
              >
                <option value="">+ Insert variable...</option>
                {VARIABLE_SOURCES.map((v) => (
                  <option key={v.key} value={v.key}>{v.label}</option>
                ))}
              </select>
            </span>
            <textarea
              ref={bodyRef}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              disabled={locked}
              rows={5}
              maxLength={LIMITS.body}
              placeholder="Hi {{1}}, your sample for booking {{2}} has been collected. Thank you for choosing us."
              className={`${inputClass} font-normal`}
            />
            <span className="flex justify-between font-normal text-gray-400">
              <span>Variables look like {"{{1}}"}, {"{{2}}"}. Not at the very start or end of the message.</span>
              <span>{body.length}/{LIMITS.body}</span>
            </span>
            {show(errors.body)}
          </label>

          {count > 0 && (
            <fieldset className="rounded-md border p-3">
              <legend className="px-1 text-xs font-medium text-gray-600">What fills each variable</legend>
              <div className="flex flex-col gap-2">
                {sources.map((src, i) => (
                  <label key={i} className="flex flex-wrap items-center gap-2 text-xs text-gray-600">
                    <code className="w-10 rounded bg-gray-100 px-1.5 py-0.5 text-center">{`{{${i + 1}}}`}</code>
                    <select
                      value={src}
                      onChange={(e) => setVars(sources.map((v, j) => (j === i ? (e.target.value as VariableSource) : v)))}
                      className={`${inputClass} min-w-0 flex-1`}
                      aria-label={`What fills variable ${i + 1}`}
                    >
                      <option value="">Choose...</option>
                      {VARIABLE_SOURCES.map((v) => (
                        <option key={v.key} value={v.key}>{v.label}</option>
                      ))}
                    </select>
                  </label>
                ))}
              </div>
              {show(errors.variables)}
            </fieldset>
          )}

          <label className={labelClass}>
            Footer (optional)
            <input value={footer} onChange={(e) => setFooter(e.target.value)} disabled={locked} maxLength={LIMITS.footer} placeholder="Eazy Diagnostics" className={inputClass} />
            {show(errors.footer)}
          </label>

          <fieldset className="rounded-md border p-3">
            <legend className="px-1 text-xs font-medium text-gray-600">Use this template when...</legend>
            <div className="grid gap-x-4 gap-y-1 sm:grid-cols-2">
              {EVENTS.map((ev) => {
                const applies = ev.audiences.includes(audience);
                const other = taken[`${audience}:${ev.key}`];
                const blocked = !applies || (!!other && !events.includes(ev.key));
                return (
                  <label key={ev.key} className={`flex items-start gap-2 text-sm ${blocked ? "text-gray-400" : "text-gray-800"}`}>
                    <input type="checkbox" checked={events.includes(ev.key)} disabled={blocked} onChange={() => toggleEvent(ev.key)} className="mt-1" />
                    <span>
                      {ev.label}
                      <span className="block text-[11px] text-gray-400">
                        {ev.group}
                        {!applies ? ` - not sent to ${AUDIENCE_LABELS[audience].toLowerCase()}s` : other && !events.includes(ev.key) ? ` - used by ${other}` : ""}
                      </span>
                    </span>
                  </label>
                );
              })}
            </div>
            {show(errors.events)}
            <p className="mt-2 text-xs text-gray-500">An event with no template of its own uses the generic update template.</p>
          </fieldset>
        </div>

        {/* Live preview, as the recipient would see it. */}
        <aside aria-label="Preview" className="flex flex-col gap-2">
          <span className="text-xs font-medium text-gray-600">Preview</span>
          <div className="rounded-xl bg-[#e7ddd0] p-3">
            <div className="rounded-lg rounded-tl-none bg-white p-3 text-sm text-gray-900 shadow-sm">
              <p className="whitespace-pre-wrap break-words">{preview}</p>
              {footer && <p className="mt-2 text-xs text-gray-500">{footer}</p>}
            </div>
          </div>
          <p className="text-[11px] text-gray-500">Variables are shown with sample values.</p>
        </aside>
      </div>

      {locked && <p className="mt-3 rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-900">Meta is reviewing this template, so its wording cannot change until the result is in. You can still change who gets it.</p>}
      {wordingChanged && sent && !locked && (
        <p className="mt-3 rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-900">Changing the wording sends the template back to Meta for review. Until it is approved again, the generic update template is used.</p>
      )}
      {error && <p role="alert" className="mt-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      <div className="mt-4 flex flex-wrap items-center gap-2">
        {editing ? (
          <>
            <button type="button" onClick={() => save(false)} disabled={busy} className={buttonClass}>
              {busy ? "Saving..." : wordingChanged && sent ? "Save and resubmit to Meta" : "Save"}
            </button>
            {!sent && (
              <button type="button" onClick={() => save(true)} disabled={busy} className={quietButtonClass}>Save and submit to Meta</button>
            )}
          </>
        ) : (
          <>
            <button type="button" onClick={() => save(true)} disabled={busy} className={buttonClass}>{busy ? "Saving..." : "Save and submit to Meta"}</button>
            <button type="button" onClick={() => save(false)} disabled={busy} className={quietButtonClass}>Save as draft</button>
          </>
        )}
        <button type="button" onClick={onClose} disabled={busy} className="text-sm font-medium text-gray-600 hover:underline">Cancel</button>
      </div>
    </Modal>
  );
}
