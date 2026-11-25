import type { Day, Location } from '../../shared/trip';

const LOCALE = 'en-US';

/** "2026-12-14" -> local Date at midnight (no timezone surprises). */
export function toDate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y!, m! - 1, d!);
}

export function todayIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

const fmt = (opts: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat(LOCALE, opts);
const fmtShort = fmt({ month: 'short', day: 'numeric' });
const fmtShortYear = fmt({ month: 'short', day: 'numeric', year: 'numeric' });
const fmtWeekday = fmt({ weekday: 'short' });
const fmtLong = fmt({ weekday: 'long', month: 'long', day: 'numeric' });
const fmtTime = fmt({ hour: 'numeric', minute: '2-digit' });

export const formatShort = (iso: string) => fmtShort.format(toDate(iso));
export const formatWeekday = (iso: string) => fmtWeekday.format(toDate(iso));
export const formatLong = (iso: string) => fmtLong.format(toDate(iso));
export const dayOfMonth = (iso: string) => toDate(iso).getDate();

export function formatRange(start: string, end: string): string {
  const s = toDate(start);
  const e = toDate(end);
  if (start === end) return fmtShortYear.format(s);
  if (s.getFullYear() === e.getFullYear()) return `${fmtShort.formatRange(s, e)}, ${s.getFullYear()}`;
  return fmtShortYear.formatRange(s, e);
}

export function daysBetween(a: string, b: string): number {
  return Math.round((toDate(b).getTime() - toDate(a).getTime()) / 86_400_000);
}

export type TripStatus =
  | { kind: 'upcoming'; daysLeft: number; label: string }
  | { kind: 'ongoing'; dayNumber: number; total: number; label: string }
  | { kind: 'past'; label: string };

export function tripStatus(startDate: string, endDate: string): TripStatus {
  const today = todayIso();
  const total = daysBetween(startDate, endDate) + 1;
  if (today < startDate) {
    const daysLeft = daysBetween(today, startDate);
    return { kind: 'upcoming', daysLeft, label: daysLeft === 1 ? 'Tomorrow!' : `In ${daysLeft} days` };
  }
  if (today > endDate) return { kind: 'past', label: 'Memories' };
  const dayNumber = daysBetween(startDate, today) + 1;
  return { kind: 'ongoing', dayNumber, total, label: `Day ${dayNumber} of ${total}` };
}

export function formatMoney(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat(LOCALE, { style: 'currency', currency, maximumFractionDigits: 0 }).format(amount);
  } catch {
    return `${Math.round(amount)} ${currency}`;
  }
}

export function formatHours(h: number): string {
  const hours = Math.floor(h);
  const mins = Math.round((h - hours) * 60);
  if (!hours) return `${mins} min`;
  return mins ? `${hours}h ${mins}m` : `${hours}h`;
}

export function formatDuration(min: number): string {
  return min >= 60 ? formatHours(min / 60) : `${min} min`;
}

export function formatTime(t: string): string {
  const [h, m] = t.split(':').map(Number);
  return fmtTime.format(new Date(2000, 0, 1, h, m));
}

export function formatKm(km: number): string {
  return `${new Intl.NumberFormat(LOCALE).format(Math.round(km))} km`;
}

/* ---------- Maps ---------- */

const coord = (l: Location) => `${l.lat},${l.lng}`;

export function placeUrl(title: string, loc?: Location): string {
  const q = loc ? coord(loc) : title;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;
}

export function directionsUrl(dest: Location | string): string {
  const d = typeof dest === 'string' ? dest : coord(dest);
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(d)}&travelmode=driving`;
}

/** Full day route in Google Maps: from -> stops with coordinates -> to (or last point). */
export function dayRouteUrl(day: Day): string | null {
  const points = day.stops.flatMap((s) => (s.location ? [coord(s.location)] : []));
  if (day.stay?.location) points.push(coord(day.stay.location));
  const destination = day.to ?? points.pop();
  if (!destination) return null;
  const params = new URLSearchParams({ api: '1', destination, travelmode: 'driving' });
  if (day.from) params.set('origin', day.from);
  if (points.length) params.set('waypoints', points.slice(0, 9).join('|'));
  return `https://www.google.com/maps/dir/?${params}`;
}

/* ---------- Images ---------- */

/** Ask image CDNs for a right-sized, modern-format image. */
export function sizedImage(url: string | undefined, width: number): string | undefined {
  if (!url) return undefined;
  try {
    const u = new URL(url);
    if (u.hostname === 'images.unsplash.com') {
      u.searchParams.set('w', String(width));
      u.searchParams.set('q', '70');
      u.searchParams.set('auto', 'format');
      u.searchParams.set('fit', 'crop');
      return u.toString();
    }
  } catch {
    /* not a URL */
  }
  return url;
}

/** Deterministic pretty gradient for trips without a cover photo. */
export function fallbackGradient(seed: string): string {
  const palettes = [
    ['#ff8a3d', '#ff5b2e', '#e8366b'],
    ['#0f5f56', '#3dbfa9', '#ffd166'],
    ['#5b8def', '#8a4fff', '#ff6a9a'],
    ['#ffd166', '#ff8a3d', '#c2410c'],
    ['#1d1a17', '#3b2a4a', '#ff5b2e'],
  ];
  let h = 0;
  for (const c of seed) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  const [a, b, c] = palettes[h % palettes.length]!;
  return `linear-gradient(135deg, ${a} 0%, ${b} 55%, ${c} 100%)`;
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .map((p) => p[0] ?? '')
    .join('')
    .slice(0, 2)
    .toUpperCase();
}
