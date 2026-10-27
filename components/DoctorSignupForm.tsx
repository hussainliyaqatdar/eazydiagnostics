"use client";
import { useRef, useState } from "react";
import {
  LIMITS,
  NAME_PREFIX,
  SPECIALTY_SUGGESTIONS,
  validateDoctorSignup,
  type DoctorSignupErrors,
  type DoctorSignupField,
} from "@/lib/doctor-onboarding";

type FormState = {
  fullName: string;
  clinicName: string;
  mobile: string;
  email: string;
  specialty: string;
  degree: string;
  consent: boolean;
  website: string; // honeypot: left empty by people
};

const INITIAL: FormState = {
  fullName: NAME_PREFIX,
  clinicName: "",
  mobile: "",
  email: "",
  specialty: "",
  degree: "",
  consent: false,
  website: "",
};

// Order the fields appear in, so the first problem can be brought into view.
const FIELD_ORDER: DoctorSignupField[] = ["fullName", "clinicName", "mobile", "email", "specialty", "degree", "consent"];

const inputClass = (invalid: boolean) =>
  `w-full rounded-lg border bg-white px-3 py-2.5 text-base text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-brand ${
    invalid ? "border-red-400" : "border-gray-300"
  }`;

function Field({
  id,
  label,
  hint,
  error,
  children,
}: {
  id: string;
  label: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-sm font-semibold text-gray-900">
        {label}
      </label>
      {hint && (
        <p id={`${id}-hint`} className="text-xs text-gray-500">
          {hint}
        </p>
      )}
      {children}
      {error && (
        <p id={`${id}-error`} role="alert" className="text-xs text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}

export default function DoctorSignupForm() {
  const [form, setForm] = useState<FormState>(INITIAL);
  const [errors, setErrors] = useState<DoctorSignupErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [done, setDone] = useState<{ name: string } | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
    // Clear a field's error as soon as it is edited.
    if (key in errors) setErrors((e) => ({ ...e, [key]: undefined }));
  }

  function focusFirstError(found: DoctorSignupErrors) {
    const first = FIELD_ORDER.find((f) => found[f]);
    if (!first) return;
    // After the errors have rendered.
    setTimeout(() => {
      const el = document.getElementById(`field-${first}`);
      el?.scrollIntoView({ block: "center", behavior: "smooth" });
      el?.focus({ preventScroll: true });
    }, 0);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setSubmitError("");

    const result = validateDoctorSignup(form);
    if (!result.ok) {
      setErrors(result.errors);
      focusFirstError(result.errors);
      return;
    }
    setErrors({});
    setSubmitting(true);
    try {
      const res = await fetch("/api/doctors/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setDone({ name: result.value.fullName });
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }
      if (data.errors) {
        setErrors(data.errors);
        focusFirstError(data.errors);
      }
      setSubmitError(data.error || "Something went wrong. Please try again.");
    } catch {
      setSubmitError("We couldn't reach the server. Please check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <div className="rounded-2xl border bg-white p-6 md:p-8 text-center flex flex-col items-center gap-3" role="status">
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-brand text-white" aria-hidden="true">
          <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12.5l4.5 4.5L19 7.5" />
          </svg>
        </span>
        <h2 className="text-2xl font-bold text-gray-900">{done.name} is registered!</h2>
        <p className="text-gray-700">
          <strong>Our team will share the personal booking link shortly.</strong>
        </p>
        <button
          type="button"
          onClick={() => {
            setForm(INITIAL);
            setDone(null);
          }}
          className="mt-1 text-sm font-medium text-brand hover:underline"
        >
          Register another doctor
        </button>
      </div>
    );
  }

  return (
    <form ref={formRef} onSubmit={submit} noValidate className="rounded-2xl border bg-white p-5 md:p-7 flex flex-col gap-5 shadow-sm">
      <h2 className="text-xl font-bold text-gray-900">Register a doctor</h2>

      {/* Honeypot - hidden from people, bots tend to fill it. */}
      <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
        <label>
          Website
          <input type="text" name="website" tabIndex={-1} autoComplete="off" value={form.website} onChange={(e) => set("website", e.target.value)} />
        </label>
      </div>

      <Field id="field-fullName" label="Full name" error={errors.fullName}>
        <input
          id="field-fullName"
          type="text"
          autoComplete="name"
          placeholder="e.g. Dr. Asha Rao"
          maxLength={LIMITS.fullName.max}
          value={form.fullName}
          onChange={(e) => set("fullName", e.target.value)}
          aria-invalid={errors.fullName ? true : undefined}
          aria-describedby={errors.fullName ? "field-fullName-error" : undefined}
          className={inputClass(!!errors.fullName)}
        />
      </Field>

      <Field id="field-clinicName" label="Clinic name" error={errors.clinicName}>
        <input
          id="field-clinicName"
          type="text"
          autoComplete="organization"
          placeholder="e.g. Sri Family Clinic, JP Nagar"
          maxLength={LIMITS.clinicName.max}
          value={form.clinicName}
          onChange={(e) => set("clinicName", e.target.value)}
          aria-invalid={errors.clinicName ? true : undefined}
          aria-describedby={errors.clinicName ? "field-clinicName-error" : undefined}
          className={inputClass(!!errors.clinicName)}
        />
      </Field>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field id="field-mobile" label="WhatsApp number" error={errors.mobile}>
          <input
            id="field-mobile"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            placeholder="e.g. 98450 12345"
            maxLength={20}
            value={form.mobile}
            onChange={(e) => set("mobile", e.target.value)}
            aria-invalid={errors.mobile ? true : undefined}
            aria-describedby={errors.mobile ? "field-mobile-error" : undefined}
            className={inputClass(!!errors.mobile)}
          />
        </Field>

        <Field id="field-email" label="Email (optional)" error={errors.email}>
          <input
            id="field-email"
            type="email"
            inputMode="email"
            autoComplete="email"
            placeholder="you@example.com"
            maxLength={LIMITS.email.max}
            value={form.email}
            onChange={(e) => set("email", e.target.value)}
            aria-invalid={errors.email ? true : undefined}
            aria-describedby={errors.email ? "field-email-error" : undefined}
            className={inputClass(!!errors.email)}
          />
        </Field>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field id="field-specialty" label="Specialty" error={errors.specialty}>
          <input
            id="field-specialty"
            type="text"
            list="specialty-options"
            placeholder="e.g. General Physician"
            maxLength={LIMITS.specialty.max}
            value={form.specialty}
            onChange={(e) => set("specialty", e.target.value)}
            aria-invalid={errors.specialty ? true : undefined}
            aria-describedby={errors.specialty ? "field-specialty-error" : undefined}
            className={inputClass(!!errors.specialty)}
          />
          <datalist id="specialty-options">
            {SPECIALTY_SUGGESTIONS.map((s) => (
              <option key={s} value={s} />
            ))}
          </datalist>
        </Field>

        <Field id="field-degree" label="Degree(s)" error={errors.degree}>
          <input
            id="field-degree"
            type="text"
            placeholder="e.g. MBBS, MD (General Medicine)"
            maxLength={LIMITS.degree.max}
            value={form.degree}
            onChange={(e) => set("degree", e.target.value)}
            aria-invalid={errors.degree ? true : undefined}
            aria-describedby={errors.degree ? "field-degree-error" : undefined}
            className={inputClass(!!errors.degree)}
          />
        </Field>
      </div>

      <div className="flex flex-col gap-1">
        <label className="flex cursor-pointer items-start gap-3 text-sm text-gray-700">
          <input
            id="field-consent"
            type="checkbox"
            checked={form.consent}
            onChange={(e) => set("consent", e.target.checked)}
            aria-invalid={errors.consent ? true : undefined}
            className="mt-0.5 h-5 w-5 shrink-0 accent-[#0F6E6E]"
          />
          <span>The doctor agrees to be listed as a partner doctor and to be contacted about it.</span>
        </label>
        {errors.consent && (
          <p role="alert" className="text-xs text-red-600">
            {errors.consent}
          </p>
        )}
      </div>

      {submitError && (
        <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {submitError}
        </p>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="rounded-lg bg-brand px-5 py-3.5 text-base font-semibold text-white transition hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-60"
      >
        {submitting ? "Registering..." : "Register"}
      </button>
    </form>
  );
}
