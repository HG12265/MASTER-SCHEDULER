/**
 * Formats time slots into human-readable 12-hour strings (e.g. 09:00 -> 9:00 AM)
 */
export function formatTimeSlot(timeStr: string): string {
  if (!timeStr) return "";
  const [hours, minutes] = timeStr.split(":").map(Number);
  const period = hours >= 12 ? "PM" : "AM";
  const adjustedHour = hours % 12 || 12;
  return `${adjustedHour}:${minutes.toString().padStart(2, "0")} ${period}`;
}

/**
 * Formats duration in minutes to hours and minutes string
 */
export function formatDuration(minutes: number): string {
  const hrs = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hrs > 0 && mins > 0) return `${hrs}h ${mins}m`;
  if (hrs > 0) return `${hrs}h`;
  return `${mins}m`;
}
