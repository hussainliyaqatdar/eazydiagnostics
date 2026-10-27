// SERVER-ONLY. The registry of doctors registered through /for-doctors: the
// source for the admin page, the checkout "Prescribed by" list and affiliate
// links. Saved as JSON in DATA_DIR (lib/store.ts).
import { deleteDoctor, readDoctors, saveDoctor } from "./store";
import type { Doctor } from "./types";
import type { DoctorSignup } from "./doctor-onboarding";

export type { Doctor };

export function istTimestamp(date = new Date()): string {
  return date.toLocaleString("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "medium", timeStyle: "short" });
}

// True when doctors are being saved somewhere the server wipes on every deploy
// or restart: production without DATA_DIR pointing at a persistent disk.
export function doctorStorageIsTemporary(): boolean {
  return process.env.NODE_ENV === "production" && !process.env.DATA_DIR;
}

export function registerDoctor(id: string, signup: DoctorSignup, registeredAt: string): void {
  if (doctorStorageIsTemporary()) {
    console.error("[doctors] DATA_DIR is not set - this doctor will be lost on the next deploy. Attach a persistent disk and set DATA_DIR.");
  }
  saveDoctor({
    id,
    registeredAt,
    name: signup.fullName,
    clinic: signup.clinicName,
    mobile: signup.mobile,
    email: signup.email,
    specialty: signup.specialty,
    degree: signup.degree,
  });
}

// In the order they were registered.
export function listDoctors(): Doctor[] {
  return readDoctors();
}

// Throws when the doctor is not there, so an admin is never told a delete worked when it did not.
export function removeDoctor(id: string): void {
  if (!deleteDoctor(id)) throw new Error("Doctor not found.");
}
