// Pure date/window helpers - safe to import from client components.
// (Anything that touches booking storage lives in lib/slots.ts instead.)

// Collection windows run 07:00 to 21:00 in 30-minute steps ("07:00 - 07:30" ... "20:30 - 21:00").
const FIRST_MINUTE = 7 * 60;
const LAST_MINUTE = 21 * 60;

const fmt = (mins: number) => `${String(Math.floor(mins / 60)).padStart(2, "0")}:${String(mins % 60).padStart(2, "0")}`;

function buildDailyWindows() {
  const windows: string[] = [];
  for (let m = FIRST_MINUTE; m < LAST_MINUTE; m += 30) windows.push(`${fmt(m)} - ${fmt(m + 30)}`);
  return windows;
}

export const DAILY_WINDOWS = buildDailyWindows();
export const BOOKING_WINDOW_DAYS = 14;

// Everything on the site is in Indian time, whatever the clock of the server or the visitor's device says.
const IST = "Asia/Kolkata";

// Today's date and the minutes since midnight, in Indian time.
export function nowIST(now: Date = new Date()): { date: string; minutes: number } {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: IST, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(now);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "00";
  return { date: `${get("year")}-${get("month")}-${get("day")}`, minutes: Number(get("hour")) * 60 + Number(get("minute")) };
}

export function getUpcomingDates(days = BOOKING_WINDOW_DAYS, now: Date = new Date()): string[] {
  const [y, m, d] = nowIST(now).date.split("-").map(Number);
  const dates: string[] = [];
  for (let i = 0; i < days; i++) dates.push(new Date(Date.UTC(y, m - 1, d + i)).toISOString().slice(0, 10));
  return dates;
}

export function formatDateLabel(iso: string) {
  const d = new Date(iso + "T00:00:00");
  const weekday = d.toLocaleDateString("en-IN", { weekday: "short" });
  const day = d.getDate();
  const month = d.toLocaleDateString("en-IN", { month: "short" });
  return { weekday, day, month };
}

// "07:30 - 08:00" -> 450 (minutes since midnight when the window starts).
export function slotStartMinutes(slot: string): number {
  const [h, m] = slot.split(" - ")[0].split(":").map(Number);
  return h * 60 + m;
}

// A window that has already started (or finished) cannot be booked: the visit would be in the past.
export function hasSlotPassed(date: string, slot: string, now: Date = new Date()): boolean {
  const today = nowIST(now);
  if (date < today.date) return true;
  if (date > today.date) return false;
  return slotStartMinutes(slot) <= today.minutes;
}

// How the day is split on the checkout page.
export type SlotGroup = "morning" | "afternoon" | "evening";
export const SLOT_GROUPS: { id: SlotGroup; label: string; hours: string }[] = [
  { id: "morning", label: "Morning", hours: "7 AM - 12 PM" },
  { id: "afternoon", label: "Afternoon", hours: "12 - 5 PM" },
  { id: "evening", label: "Evening", hours: "5 - 9 PM" },
];

export function slotGroup(slot: string): SlotGroup {
  const start = slotStartMinutes(slot);
  return start < 12 * 60 ? "morning" : start < 17 * 60 ? "afternoon" : "evening";
}
