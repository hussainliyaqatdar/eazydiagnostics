import fs from "fs";
import path from "path";
import type { Booking } from "./types";

const DATA_DIR = path.join(process.cwd(), ".data");
const BOOKINGS_FILE = path.join(DATA_DIR, "bookings.json");
const EMAILS_FILE = path.join(DATA_DIR, "emails.json");

function ensureFile(file: string) {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(file)) fs.writeFileSync(file, "[]", "utf-8");
}

export function readBookings(): Booking[] {
  ensureFile(BOOKINGS_FILE);
  return JSON.parse(fs.readFileSync(BOOKINGS_FILE, "utf-8"));
}

export function saveBooking(booking: Booking) {
  const bookings = readBookings();
  bookings.push(booking);
  fs.writeFileSync(BOOKINGS_FILE, JSON.stringify(bookings, null, 2), "utf-8");
}

export function getBooking(id: string): Booking | undefined {
  return readBookings().find((b) => b.id === id);
}

export type SentEmail = {
  id: string;
  to: string;
  toLabel: "patient" | "owner" | "doctor";
  subject: string;
  html: string;
  sentAt: string;
};

export function readEmails(): SentEmail[] {
  ensureFile(EMAILS_FILE);
  return JSON.parse(fs.readFileSync(EMAILS_FILE, "utf-8"));
}

export function saveEmail(email: SentEmail) {
  const emails = readEmails();
  emails.push(email);
  fs.writeFileSync(EMAILS_FILE, JSON.stringify(emails, null, 2), "utf-8");
}

// Doctor sign-ups. In production these go to the Google Sheet (lib/google-sheet.ts);
// this file is only the local-development stand-in for when no sheet is configured.
const DOCTOR_SIGNUPS_FILE = path.join(DATA_DIR, "doctor-signups.json");

export function readDoctorSignups(): Record<string, string>[] {
  ensureFile(DOCTOR_SIGNUPS_FILE);
  return JSON.parse(fs.readFileSync(DOCTOR_SIGNUPS_FILE, "utf-8"));
}

// Returns false when no doctor has that id.
export function deleteDoctorSignup(id: string): boolean {
  const all = readDoctorSignups();
  const kept = all.filter((r) => r["Doctor ID"] !== id);
  if (kept.length === all.length) return false;
  fs.writeFileSync(DOCTOR_SIGNUPS_FILE, JSON.stringify(kept, null, 2), "utf-8");
  return true;
}

export function saveDoctorSignup(record: Record<string, string>) {
  ensureFile(DOCTOR_SIGNUPS_FILE);
  const all: Record<string, string>[] = JSON.parse(fs.readFileSync(DOCTOR_SIGNUPS_FILE, "utf-8"));
  all.push(record);
  fs.writeFileSync(DOCTOR_SIGNUPS_FILE, JSON.stringify(all, null, 2), "utf-8");
}
