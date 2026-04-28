export type WorkHourEntry = {
  dayOfWeek: number;
  openTime: string;
  closeTime: string;
  isClosed?: boolean;
};

export const TIMEZONE = "Africa/Cairo";

export const DEFAULT_WORK_HOURS: WorkHourEntry[] = [
  { dayOfWeek: 0, openTime: "10:00", closeTime: "18:00" },
  { dayOfWeek: 1, openTime: "10:00", closeTime: "18:00" },
  { dayOfWeek: 2, openTime: "10:00", closeTime: "18:00" },
  { dayOfWeek: 3, openTime: "10:00", closeTime: "18:00" },
  { dayOfWeek: 4, openTime: "10:00", closeTime: "16:00" },
  { dayOfWeek: 5, openTime: "00:00", closeTime: "00:00", isClosed: true },
  { dayOfWeek: 6, openTime: "11:00", closeTime: "16:00" },
];

function getCairoParts(date: Date): { dayOfWeek: number; hour: number; minute: number } {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: TIMEZONE,
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const parts = fmt.formatToParts(date);
  const wd = parts.find((p) => p.type === "weekday")?.value ?? "Sun";
  const hour = parseInt(parts.find((p) => p.type === "hour")?.value ?? "0", 10);
  const minute = parseInt(parts.find((p) => p.type === "minute")?.value ?? "0", 10);
  const map: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  return { dayOfWeek: map[wd] ?? 0, hour, minute };
}

function timeToMinutes(t: string): number {
  const [h, m] = t.split(":").map((s) => parseInt(s, 10));
  return (h ?? 0) * 60 + (m ?? 0);
}

export function isOfficeOpen(now: Date, hours: WorkHourEntry[] = DEFAULT_WORK_HOURS): boolean {
  const { dayOfWeek, hour, minute } = getCairoParts(now);
  const today = hours.find((h) => h.dayOfWeek === dayOfWeek);
  if (!today || today.isClosed) return false;
  const cur = hour * 60 + minute;
  return cur >= timeToMinutes(today.openTime) && cur < timeToMinutes(today.closeTime);
}

export function getNextOpenAt(now: Date, hours: WorkHourEntry[] = DEFAULT_WORK_HOURS): Date | null {
  for (let i = 0; i < 8; i++) {
    const candidate = new Date(now.getTime() + i * 24 * 60 * 60 * 1000);
    const { dayOfWeek } = getCairoParts(candidate);
    const day = hours.find((h) => h.dayOfWeek === dayOfWeek);
    if (!day || day.isClosed) continue;
    const [oh, om] = day.openTime.split(":").map((s) => parseInt(s, 10));
    const fmt = new Intl.DateTimeFormat("en-CA", {
      timeZone: TIMEZONE,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
    const ymd = fmt.format(candidate);
    const iso = `${ymd}T${String(oh).padStart(2, "0")}:${String(om).padStart(2, "0")}:00+02:00`;
    const opening = new Date(iso);
    if (opening.getTime() > now.getTime()) return opening;
  }
  return null;
}

export function generateTimeSlots(
  date: Date,
  hours: WorkHourEntry[] = DEFAULT_WORK_HOURS,
  slotMinutes = 30,
): string[] {
  const { dayOfWeek } = getCairoParts(date);
  const day = hours.find((h) => h.dayOfWeek === dayOfWeek);
  if (!day || day.isClosed) return [];
  const open = timeToMinutes(day.openTime);
  const close = timeToMinutes(day.closeTime);
  const slots: string[] = [];
  for (let t = open; t + slotMinutes <= close; t += slotMinutes) {
    const h = Math.floor(t / 60);
    const m = t % 60;
    slots.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
  }
  return slots;
}
