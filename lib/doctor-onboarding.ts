// Doctor registration (/for-doctors): the fields, their limits, and the validation.
// Pure and dependency-free so the exact same checks run in the browser (inline
// errors as the form is filled) and on the server (the authoritative check
// before anything is saved or emailed). The form is used by doctors themselves
// and by the sales team registering a doctor.

// Suggestions only - the field accepts any specialty.
export const SPECIALTY_SUGGESTIONS = [
  "General Physician",
  "Gynaecologist",
  "Obstetrician",
  "Diabetologist",
  "Endocrinologist",
  "Cardiologist",
  "Paediatrician",
  "Dermatologist",
  "Orthopaedic Surgeon",
  "ENT Specialist",
  "Psychiatrist",
  "Dietitian / Nutritionist",
];

export const LIMITS = {
  fullName: { min: 2, max: 80 },
  clinicName: { min: 2, max: 100 },
  email: { max: 120 },
  specialty: { min: 2, max: 80 },
  degree: { min: 2, max: 120 },
} as const;

// What the "Full name" field starts with, so the doctor only has to add a name.
export const NAME_PREFIX = "Dr. ";

export type DoctorSignup = {
  fullName: string;
  clinicName: string;
  mobile: string; // 10-digit Indian WhatsApp number
  email: string; // "" when not given
  specialty: string;
  degree: string;
};

export type DoctorSignupField = "fullName" | "clinicName" | "mobile" | "email" | "specialty" | "degree" | "consent";
export type DoctorSignupErrors = Partial<Record<DoctorSignupField, string>>;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function text(value: unknown, max: number): string {
  return typeof value === "string" ? value.replace(/\s+/g, " ").trim().slice(0, max + 1) : "";
}

// "+91 98450 12345", "098450-12345" -> "9845012345". null when it is not a valid
// Indian mobile number.
export function normalizeMobile(value: string): string | null {
  let digits = value.replace(/\D/g, "");
  if (digits.length === 12 && digits.startsWith("91")) digits = digits.slice(2);
  else if (digits.length === 11 && digits.startsWith("0")) digits = digits.slice(1);
  return /^[6-9]\d{9}$/.test(digits) ? digits : null;
}

// "9845012345" -> "+91 98450 12345"
export function formatMobile(mobile: string): string {
  return mobile.length === 10 ? `+91 ${mobile.slice(0, 5)} ${mobile.slice(5)}` : mobile;
}

export function validateDoctorSignup(raw: unknown): { ok: true; value: DoctorSignup } | { ok: false; errors: DoctorSignupErrors } {
  const input = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const errors: DoctorSignupErrors = {};

  const fullName = text(input.fullName, LIMITS.fullName.max);
  // The field starts as "Dr. ", so an untouched field must not count as a name.
  const nameWithoutTitle = fullName.replace(/^dr\.?\s*/i, "");
  if (nameWithoutTitle.length < LIMITS.fullName.min) errors.fullName = "Enter the doctor's full name.";
  else if (fullName.length > LIMITS.fullName.max) errors.fullName = `Keep the name under ${LIMITS.fullName.max} characters.`;

  const clinicName = text(input.clinicName, LIMITS.clinicName.max);
  if (clinicName.length < LIMITS.clinicName.min) errors.clinicName = "Enter the clinic name.";
  else if (clinicName.length > LIMITS.clinicName.max) errors.clinicName = `Keep this under ${LIMITS.clinicName.max} characters.`;

  // The WhatsApp number is how the team reaches the doctor, so it is required.
  let mobile = "";
  const mobileInput = text(input.mobile, 30);
  if (!mobileInput) errors.mobile = "Enter the WhatsApp number.";
  else {
    const normalized = normalizeMobile(mobileInput);
    if (normalized) mobile = normalized;
    else errors.mobile = "Enter a valid 10-digit WhatsApp number.";
  }

  const email = text(input.email, LIMITS.email.max).toLowerCase();
  if (email && (email.length > LIMITS.email.max || !EMAIL_RE.test(email))) errors.email = "Enter a valid email address.";

  const specialty = text(input.specialty, LIMITS.specialty.max);
  if (specialty.length < LIMITS.specialty.min) errors.specialty = "Enter the specialty.";
  else if (specialty.length > LIMITS.specialty.max) errors.specialty = `Keep this under ${LIMITS.specialty.max} characters.`;

  const degree = text(input.degree, LIMITS.degree.max);
  if (degree.length < LIMITS.degree.min) errors.degree = "Enter the degree(s), e.g. MBBS, MD.";
  else if (degree.length > LIMITS.degree.max) errors.degree = `Keep this under ${LIMITS.degree.max} characters.`;

  if (input.consent !== true) errors.consent = "Tick to continue.";

  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return { ok: true, value: { fullName, clinicName, mobile, email, specialty, degree } };
}
