// SERVER-ONLY. The registry of doctors: the source for the admin page, the
// checkout "Prescribed by" list and affiliate links.
//
// Two places feed it:
//  - data/doctors.json - the doctors kept IN THE CODE. They survive every deploy.
//    This is the permanent list: add a doctor by pasting an entry and redeploying
//    (the owner email for each new registration carries a ready-to-paste entry).
//  - doctors registered through /for-doctors since the last deploy, saved as JSON
//    in DATA_DIR (lib/store.ts). Without a persistent disk these are wiped on the
//    next deploy, which is why they should be copied into data/doctors.json.
import builtInDoctors from "@/data/doctors.json";
import { deleteDoctor, readDoctors, saveDoctor } from "./store";
import type { Doctor } from "./types";
import type { DoctorSignup } from "./doctor-onboarding";

export type { Doctor };

const BUILT_IN: Doctor[] = (builtInDoctors as Doctor[]).map((d) => ({ ...d, builtIn: true }));

export function istTimestamp(date = new Date()): string {
  return date.toLocaleString("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "medium", timeStyle: "short" });
}

// True when new registrations are being saved somewhere the server wipes on
// every deploy or restart: production without DATA_DIR pointing at a persistent disk.
export function doctorStorageIsTemporary(): boolean {
  return process.env.NODE_ENV === "production" && !process.env.DATA_DIR;
}

export function isBuiltInDoctor(id: string): boolean {
  return BUILT_IN.some((d) => d.id === id);
}

export function registerDoctor(id: string, signup: DoctorSignup, registeredAt: string): void {
  if (doctorStorageIsTemporary()) {
    console.error("[doctors] DATA_DIR is not set - this registration is lost on the next deploy. Add the doctor to data/doctors.json (the owner email has the entry).");
  }
  saveDoctor(toDoctor(id, signup, registeredAt));
}

// The shape stored in data/doctors.json and in DATA_DIR.
export function toDoctor(id: string, signup: DoctorSignup, registeredAt: string): Doctor {
  return {
    id,
    registeredAt,
    name: signup.fullName,
    clinic: signup.clinicName,
    mobile: signup.mobile,
    email: signup.email,
    specialty: signup.specialty,
    degree: signup.degree,
  };
}

// Doctors in the code first, then new registrations in the order they came in.
export function listDoctors(): Doctor[] {
  const ids = new Set(BUILT_IN.map((d) => d.id));
  return [...BUILT_IN, ...readDoctors().filter((d) => !ids.has(d.id))];
}

// Throws when the doctor is not there or is part of the code, so an admin is
// never told a delete worked when it did not.
export function removeDoctor(id: string): void {
  if (isBuiltInDoctor(id)) throw new Error("This doctor is listed in data/doctors.json. Remove them there and redeploy.");
  if (!deleteDoctor(id)) throw new Error("Doctor not found.");
}
