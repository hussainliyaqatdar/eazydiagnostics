import fs from "fs";
import path from "path";
import type { Booking, Doctor } from "./types";

// DATA_DIR points the files at a persistent disk in production (Render wipes
// the default folder on every deploy or restart); locally it is just .data/.
const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), ".data");
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

// Registered doctors (/for-doctors). The admin page, affiliate links and the
// checkout "Prescribed by" list all read from here.
const DOCTORS_FILE = path.join(DATA_DIR, "doctors.json");

export function readDoctors(): Doctor[] {
  ensureFile(DOCTORS_FILE);
  return JSON.parse(fs.readFileSync(DOCTORS_FILE, "utf-8"));
}

export function saveDoctor(doctor: Doctor) {
  const all = readDoctors();
  all.push(doctor);
  fs.writeFileSync(DOCTORS_FILE, JSON.stringify(all, null, 2), "utf-8");
}

// Returns false when no doctor has that id.
export function deleteDoctor(id: string): boolean {
  const all = readDoctors();
  const kept = all.filter((d) => d.id !== id);
  if (kept.length === all.length) return false;
  fs.writeFileSync(DOCTORS_FILE, JSON.stringify(kept, null, 2), "utf-8");
  return true;
}
