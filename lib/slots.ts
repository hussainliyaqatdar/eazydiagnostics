import { getBookedSlots } from "./orders";
import { DAILY_WINDOWS } from "./booking-dates";

export { DAILY_WINDOWS, BOOKING_WINDOW_DAYS, getUpcomingDates } from "./booking-dates";

// Placeholder capacity model: 1 collection team/day, one booking per window.
// Adjust once real team count is confirmed.
export async function getSlotsForDate(date: string) {
  const takenToday = await getBookedSlots(date);
  return DAILY_WINDOWS.map((slot) => ({
    slot,
    available: !takenToday.has(slot),
    bookedCount: takenToday.has(slot) ? 1 : 0,
  }));
}
