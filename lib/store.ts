import fs from "fs";
import path from "path";

// Local-development files only (the dev email inbox). Orders and doctors live in
// the database - see lib/db.ts.
const DATA_DIR = path.join(process.cwd(), ".data");
const EMAILS_FILE = path.join(DATA_DIR, "emails.json");

function ensureFile(file: string) {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(file)) fs.writeFileSync(file, "[]", "utf-8");
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
