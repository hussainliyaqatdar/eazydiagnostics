"use client";
import { useMemo, useRef, useState } from "react";
import Modal from "../Modal";
import { useToast } from "../Toaster";
import { buttonClass, inputClass, labelClass, quietButtonClass, sendForm, sendJson } from "../api";
import type { MediaItem } from "@/lib/whatsapp-media";
import type { WaTemplate } from "@/lib/whatsapp-templates";
import {
  AUDIENCES,
  AUDIENCE_LABELS,
  CATEGORIES,
  BUTTON_LIMITS,
  LANGUAGES,
  LIMITS,
  VARIABLE_SOURCES,
  isDynamicUrl,
  renderExample,
  validateTemplate,
  variableCount,
  type Audience,
  type TemplateButton,
  type TemplateCategory,
  type VariableSource,
} from "@/lib/whatsapp-events";

type Props = {
  // The template being edited, or null to write a new one.
  template: WaTemplate | null;
  // Every template, so a new one can start from an existing one as a reference.
  templates: WaTemplate[];
  // The image library, for the header image.
  media: MediaItem[];
  onClose: () => void;
  onSaved: () => void;
};

// Write or edit a template: its wording with {{variables}}, what fills each variable, and who receives it.
// Which status events use it is chosen on the "Template - Status Mapping" tab, not here. A live preview
// shows it as the recipient would read it.
export default function TemplateForm({ template, templates, media, onClose, onSaved }: Props) {
  const editing = !!template;
  const start = template;
  const [name, setName] = useState(start?.name ?? "");
  const [language, setLanguage] = useState(start?.language ?? "en");
  const [category, setCategory] = useState<TemplateCategory>(start?.category ?? "UTILITY");
  const [audience, setAudience] = useState<Audience>(start?.audience ?? "patient");
  const [body, setBody] = useState(start?.body ?? "");
  const [footer, setFooter] = useState(start?.footer ?? "");
  const [vars, setVars] = useState<(VariableSource | "")[]>(start?.variables ?? []);
  // Link buttons under the message (up to two).
  const [buttons, setButtons] = useState<TemplateButton[]>(start?.buttons ?? []);
  const [busy, setBusy] = useState(false);
  const { toast } = useToast();
  const [touched, setTouched] = useState(false);
  // The existing template this one was started from, if any.
  const [reference, setReference] = useState<number | null>(null);
  // The header image: a library image (e.g. a payment QR code) shown above the message, or none.
  const [headerId, setHeaderId] = useState<number | null>(template?.headerMediaId ?? null);
  const [library, setLibrary] = useState<MediaItem[]>(media);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const bodyRef = useRef<HTMLTextAreaElement>(null);

  // Wording is locked while Meta is reviewing it.
  const locked = template?.status === "PENDING";
  const sent = !!template?.metaId;
  const count = variableCount(body);
  const sources: (VariableSource | "")[] = useMemo(() => Array.from({ length: count }, (_, i) => vars[i] ?? ""), [count, vars]);

  const errors = validateTemplate({ name, language, category, audience, events: [], body, footer, variables: sources as VariableSource[], buttons }, true);
  const draftErrors = validateTemplate({ name, language, category, audience, events: [], body, footer, variables: sources as VariableSource[], buttons }, false);

  const setButton = (i: number, patch: Partial<TemplateButton>) => setButtons((cur) => cur.map((b, j) => (j === i ? { ...b, ...patch } : b)));

  async function uploadImage(file: File | undefined) {
    if (!file) return;
    setUploading(true);
    const form = new FormData();
    form.append("file", file);
    const res = await sendForm<{ media: MediaItem }>("/api/admin/whatsapp/media", form);
    if (!res.ok) toast({ kind: "error", title: "Couldn't upload the image", message: res.error });
    else {
      setLibrary((cur) => [res.data.media, ...cur]);
      setHeaderId(res.data.media.id);
      toast({ kind: "success", title: "Image uploaded", message: `${res.data.media.name} is now this template's header image.` });
    }
    if (fileRef.current) fileRef.current.value = "";
    setUploading(false);
  }

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

  // Starts from an existing template: its wording, variable mapping, footer, category and language are
  // copied in (who it is sent to stays as chosen here), ready to be adjusted.
  function useReference(id: number | null) {
    setReference(id);
    const ref = templates.find((t) => t.id === id);
    if (!ref) return;
    setBody(ref.body);
    setFooter(ref.footer);
    setVars(ref.variables);
    setCategory(ref.category);
    setLanguage(ref.language);
    setHeaderId(ref.headerMediaId);
    setButtons(ref.buttons);
    // A name is suggested only when none has been typed: "<base>_<audience>".
    if (!name.trim()) {
      const base = `${ref.name.replace(/_(patient|doctor)s?$/, "")}_${audience}`;
      let candidate = base;
      for (let n = 2; templates.some((t) => t.name === candidate && t.language === ref.language); n++) candidate = `${base}_${n}`;
      setName(candidate);
    }
  }

  async function save(submit: boolean) {
    setTouched(true);
    const errs = submit ? errors : draftErrors;
    if (Object.values(errs).some(Boolean)) return;
    setBusy(true);
    // Events are not sent: a new template starts unmapped, and an edit leaves its mapping as it is.
    const payload = { name, language, category, audience, body, footer, variables: sources, buttons, headerMediaId: headerId, submit };
    const res = editing
      ? await sendJson<{ submitError?: string }>(`/api/admin/whatsapp/templates/${template!.id}`, "PATCH", payload)
      : await sendJson<{ submitError?: string }>("/api/admin/whatsapp/templates", "POST", payload);
    if (!res.ok) {
      toast({ kind: "error", title: "Couldn't save the template", message: res.error });
      setBusy(false);
      return;
    }
    if (res.data.submitError) {
      // Saved, but Meta turned it down: keep the form open so it can be fixed.
      toast({ kind: "warning", title: "Saved, but Meta did not accept it", message: res.data.submitError });
      setBusy(false);
      onSaved();
      return;
    }
    toast({
      kind: "success",
      title: submit ? "Template saved and sent to Meta" : editing ? "Template saved" : "Draft saved",
      message: editing ? name : `${name}. Map it to a status on the Template - Status Mapping tab to start using it.`,
    });
    onSaved();
    onClose();
  }

  const show = (msg?: string) => (touched && msg ? <span role="alert" className="text-xs font-normal text-red-600">{msg}</span> : null);
  const preview = renderExample(body, sources) || "Your message will appear here.";
  const headerChanged = editing && headerId !== template!.headerMediaId;
  const norm = (l: TemplateButton[]) => JSON.stringify(l.map((b) => [b.text.trim(), b.url.trim(), isDynamicUrl(b.url) ? b.variable : ""]));
  const buttonsChanged = editing && norm(buttons) !== norm(template!.buttons);
  const wordingChanged = editing && (body.trim() !== template!.body || footer.trim() !== template!.footer || category !== template!.category || headerChanged || buttonsChanged);

  return (
    <Modal title={editing ? `Edit ${template!.name}` : "New WhatsApp template"} onClose={onClose} wide>
      <div className="grid gap-5 md:grid-cols-[1fr_17rem]">
        <div className="flex flex-col gap-4">
          {!editing && templates.length > 0 && (
            <label className={`${labelClass} rounded-md bg-gray-50 p-3`}>
              Start from an existing template (optional)
              <select value={reference ?? ""} onChange={(e) => useReference(e.target.value ? Number(e.target.value) : null)} className={inputClass} aria-label="Start from an existing template">
                <option value="">Start blank</option>
                {templates.map((t) => (
                  <option key={t.id} value={t.id}>{t.name} ({AUDIENCE_LABELS[t.audience].toLowerCase()}s)</option>
                ))}
              </select>
              <span className="font-normal text-gray-500">
                {reference
                  ? "Its wording, variables, footer and category are copied below. Adjust them for this audience; the audience stays as you chose."
                  : "Copies an existing template's wording and variables so you do not start from scratch."}
              </span>
            </label>
          )}
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
              <select value={audience} onChange={(e) => setAudience(e.target.value as Audience)} className={inputClass}>
                {AUDIENCES.map((a) => (
                  <option key={a} value={a}>{AUDIENCE_LABELS[a]}s</option>
                ))}
              </select>
              <span className="font-normal text-gray-400">
                Patients and doctors each get their own template for an event.
                {editing && audience !== template!.audience && template!.events.length > 0 && " Changing this removes the template's status mappings."}
              </span>
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
              rows={4}
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

          <fieldset className="flex flex-col gap-3 rounded-md border p-3" disabled={locked}>
            <legend className="px-1 text-xs font-medium text-gray-600">Link buttons (optional)</legend>
            {buttons.map((b, i) => {
              const dynamic = isDynamicUrl(b.url);
              return (
                <div key={i} className="flex flex-col gap-2 rounded-md bg-gray-50 p-2.5">
                  <div className="flex items-center justify-between text-xs font-medium text-gray-600">
                    <span>Button {i + 1}</span>
                    <button type="button" onClick={() => setButtons((cur) => cur.filter((_, j) => j !== i))} className="font-normal text-gray-500 underline hover:text-red-600">Remove</button>
                  </div>
                  <label className={labelClass}>
                    Text on the button
                    <input value={b.text} onChange={(e) => setButton(i, { text: e.target.value })} maxLength={BUTTON_LIMITS.text} placeholder="View report" className={inputClass} aria-label={`Button ${i + 1} text`} />
                  </label>
                  <label className={labelClass}>
                    Link
                    <input value={b.url} onChange={(e) => setButton(i, { url: e.target.value })} placeholder="https://homecarelabs.onrender.com/api/reports/{{1}}" className={`${inputClass} font-mono`} aria-label={`Button ${i + 1} link`} />
                  </label>
                  {dynamic && (
                    <label className={labelClass}>
                      What fills {"{{1}}"} at the end of the link
                      <select value={b.variable} onChange={(e) => setButton(i, { variable: e.target.value as VariableSource })} className={inputClass} aria-label={`What fills the end of button ${i + 1}'s link`}>
                        <option value="">Choose...</option>
                        {VARIABLE_SOURCES.map((v) => (
                          <option key={v.key} value={v.key}>{v.label}</option>
                        ))}
                      </select>
                    </label>
                  )}
                </div>
              );
            })}
            {buttons.length < BUTTON_LIMITS.count && (
              <button type="button" onClick={() => setButtons((cur) => [...cur, { text: "", url: "", variable: "" }])} className={`${quietButtonClass} self-start`}>
                + Add a link button
              </button>
            )}
            <span className="text-[11px] text-gray-500">
              A tap-to-open button under the message. The link must start with https://. To make part of it change with each message (for example a report), end it with {"{{1}}"} and choose what fills it.
              Up to {BUTTON_LIMITS.count} buttons, {BUTTON_LIMITS.text} characters each. Meta reviews the buttons with the template, so changing them sends it back for review.
            </span>
            {show(errors.buttons)}
          </fieldset>

          <div className="flex flex-col gap-2 rounded-md border p-3">
            <span className="text-xs font-medium text-gray-600">Header image (optional)</span>
            <div className="flex flex-wrap items-center gap-2">
              <select
                aria-label="Header image"
                value={headerId ?? ""}
                onChange={(e) => setHeaderId(e.target.value ? Number(e.target.value) : null)}
                disabled={locked}
                className={`${inputClass} min-w-0 flex-1`}
              >
                <option value="">No image</option>
                {library.map((m) => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
              <input ref={fileRef} type="file" accept="image/png,image/jpeg" className="hidden" onChange={(e) => uploadImage(e.target.files?.[0])} aria-label="Upload a header image" />
              <button type="button" onClick={() => fileRef.current?.click()} disabled={locked || uploading} className={quietButtonClass}>
                {uploading ? "Uploading..." : "Upload new image"}
              </button>
            </div>
            <span className="text-[11px] text-gray-500">
              Sent above the message, for example a payment QR code. JPEG or PNG, up to 5 MB. Meta reviews the template with this image, so changing it sends the template back for review.
            </span>
          </div>

        </div>

        {/* Live preview, as the recipient would see it. */}
        <aside aria-label="Preview" className="flex flex-col gap-2">
          <span className="text-xs font-medium text-gray-600">Preview</span>
          <div className="rounded-xl bg-[#e7ddd0] p-3">
            <div className="rounded-lg rounded-tl-none bg-white p-1.5 text-sm text-gray-900 shadow-sm">
              {headerId && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={`/api/admin/whatsapp/media/${headerId}`} alt="Header" className="mb-1.5 max-h-64 w-full rounded-md object-contain bg-gray-50" />
              )}
              <p className="whitespace-pre-wrap break-words px-1.5 pb-1">{preview}</p>
              {footer && <p className="mt-1 px-1.5 pb-1 text-xs text-gray-500">{footer}</p>}
            </div>
            {buttons.some((b) => b.text.trim()) && (
              <div className="mt-1 flex flex-col gap-1">
                {buttons.filter((b) => b.text.trim()).map((b, i) => (
                  <div key={i} className="flex items-center justify-center gap-1.5 rounded-lg bg-white px-3 py-2 text-sm font-medium text-sky-700 shadow-sm">
                    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" />
                    </svg>
                    {b.text}
                  </div>
                ))}
              </div>
            )}
          </div>
          <p className="text-[11px] text-gray-500">Variables are shown with sample values.</p>
        </aside>
      </div>

      {locked && <p className="mt-3 rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-900">Meta is reviewing this template, so its wording cannot change until the result is in.</p>}
      {wordingChanged && sent && !locked && (
        <p className="mt-3 rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-900">Changing the wording sends the template back to Meta for review. Until it is approved again, nothing is sent for the statuses mapped to it.</p>
      )}

      <div className="sticky -bottom-4 -mx-5 -mb-4 mt-4 flex flex-wrap items-center gap-2 border-t bg-white px-5 py-3">
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
