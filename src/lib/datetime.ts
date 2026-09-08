const DAY_FMT = new Intl.DateTimeFormat('it-IT', { weekday: 'short', day: 'numeric', month: 'short' });
const FULL_FMT = new Intl.DateTimeFormat('it-IT', { weekday: 'long', day: 'numeric', month: 'long' });
const TIME_FMT = new Intl.DateTimeFormat('it-IT', { hour: '2-digit', minute: '2-digit' });

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export function formatDayShort(d: Date | string): string {
  return cap(DAY_FMT.format(new Date(d)));
}

export function formatFullDate(d: Date | string): string {
  return cap(FULL_FMT.format(new Date(d)));
}

export function formatTime(d: Date | string): string {
  return TIME_FMT.format(new Date(d));
}

export function formatRange(start: Date | string, end: Date | string): string {
  return `${formatTime(start)}–${formatTime(end)}`;
}

/** Prossimi `count` giorni a partire da oggi (mezzanotte locale). */
export function nextDays(count: number, from: Date = new Date()): Date[] {
  const base = new Date(from);
  base.setHours(0, 0, 0, 0);
  return Array.from({ length: count }, (_, i) => {
    const d = new Date(base);
    d.setDate(d.getDate() + i);
    return d;
  });
}

/** Combina un giorno (mezzanotte) con un orario "HH:MM". */
export function combineDayTime(day: Date, hhmm: string): Date {
  const [h, m] = hhmm.split(':').map(Number);
  const d = new Date(day);
  d.setHours(h, m ?? 0, 0, 0);
  return d;
}

export function addMinutes(d: Date, minutes: number): Date {
  return new Date(d.getTime() + minutes * 60_000);
}

export function sameDay(a: Date | string, b: Date | string): boolean {
  const x = new Date(a);
  const y = new Date(b);
  return (
    x.getFullYear() === y.getFullYear() &&
    x.getMonth() === y.getMonth() &&
    x.getDate() === y.getDate()
  );
}

export function isPast(d: Date | string): boolean {
  return new Date(d).getTime() < Date.now();
}

/** "tra 2 giorni", "domani", "oggi", "2 giorni fa". */
export function relativeDay(d: Date | string): string {
  const target = new Date(d);
  target.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = Math.round((target.getTime() - today.getTime()) / 86_400_000);
  if (diff === 0) return 'Oggi';
  if (diff === 1) return 'Domani';
  if (diff === -1) return 'Ieri';
  if (diff > 1) return `Tra ${diff} giorni`;
  return `${Math.abs(diff)} giorni fa`;
}
