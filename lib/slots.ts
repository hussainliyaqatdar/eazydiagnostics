import { getBookedSlots } from "./orders";
import { DAILY_WINDOWS, hasSlotPassed } from "./booking-dates";

export { DAILY_WINDOWS, BOOKING_WINDOW_DAYS, getUpcomingDates } from "./booking-dates";

export type SlotInfo = {
  slot: string;
  // Can be booked: not taken, and has not already started.
  available: boolean;
  bookedCount: number;
  // The window has already started (or the whole date is in the past), so it can never be booked now.
  passed: boolean;
};

// Placeholder capacity model: 1 collection team/day, one booking per window.
// Adjust once real team count is confirmed.
export async function getSlotsForDate(date: string, now: Date = new Date()): Promise<SlotInfo[]> {
  const takenToday = await getBookedSlots(date);
  return DAILY_WINDOWS.map((slot) => {
    const passed = hasSlotPassed(date, slot, now);
    return { slot, available: !passed && !takenToday.has(slot), bookedCount: takenToday.has(slot) ? 1 : 0, passed };
  });
}
