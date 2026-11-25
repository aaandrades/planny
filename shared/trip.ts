import { z } from 'zod';

/**
 * Planny trip format (version 1).
 * Single source of truth for the API, the UI and the generated JSON Schema
 * (docs/trip.schema.json — regenerate with `npm run schema`).
 * Every field has a description so an AI agent can produce a complete plan.
 */

export const STOP_TYPES = [
  'drive',
  'food',
  'coffee',
  'sight',
  'activity',
  'nature',
  'beach',
  'shopping',
  'fuel',
  'rest',
  'photo',
  'stay',
  'other',
] as const;
export type StopType = (typeof STOP_TYPES)[number];

export const STAY_KINDS = ['hotel', 'motel', 'apartment', 'house', 'hostel', 'camping', 'cabin', 'other'] as const;

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD');
const time = z.string().regex(/^\d{1,2}:\d{2}$/, 'Use HH:MM (24h)');
const text = z.string().trim();
const appManaged = <T extends z.ZodTypeAny>(s: T) => s.optional().describe('Managed by the app. Do not include.');

export const LocationSchema = z
  .object({
    lat: z.number().min(-90).max(90).describe('Latitude in decimal degrees, e.g. 36.1578'),
    lng: z.number().min(-180).max(180).describe('Longitude in decimal degrees, e.g. -121.6722'),
    address: text.optional().describe('Human-readable street address or area name'),
  })
  .describe('Exact coordinates of the place. Powers the map and the Navigate buttons.');

export const StopSchema = z
  .object({
    id: appManaged(text),
    time: time.optional().describe('Planned arrival time, 24h "HH:MM"'),
    title: text.min(1).describe('Name of the place or activity, e.g. "McWay Falls"'),
    type: z
      .enum(STOP_TYPES)
      .catch('other')
      .default('other')
      .describe('Category used for the icon and color. Unknown values become "other".'),
    description: text.optional().describe('What WE will do here, in 1–2 sentences: the plan for this stop.'),
    about: text
      .optional()
      .describe('What this place IS, in 1–3 sentences: context, history, what makes it unique.'),
    whyVisit: text
      .optional()
      .describe('Why it is worth stopping, in one persuasive sentence. The hook shown on the card.'),
    highlights: z
      .array(text)
      .optional()
      .describe('2–5 specific things not to miss: a dish, a viewpoint, a trail, an exhibit…'),
    tips: text.optional().describe('Insider advice: parking, best time of day, what to bring, crowds…'),
    location: LocationSchema.optional(),
    durationMin: z.number().nonnegative().optional().describe('Expected time spent here, in minutes'),
    cost: z
      .number()
      .nonnegative()
      .optional()
      .describe('Estimated total cost for the whole group, in the trip currency'),
    openingHours: text.optional().describe('Relevant opening hours, e.g. "9:00–17:00, closed Mondays"'),
    bookingRequired: z.boolean().optional().describe('true if tickets or a reservation must be booked in advance'),
    bookingRef: text.optional().describe('Booking/confirmation number, only if already booked'),
    url: text.optional().describe('Official website (only if known to be real)'),
    image: text.optional().describe('Direct https image URL of the place (optional)'),
    optional: z.boolean().optional().describe('true for "only if we have time" stops'),
    done: appManaged(z.boolean()),
    doneBy: appManaged(text),
  })
  .describe('A place or activity during the day, listed in the order it happens.');

export const StaySchema = z
  .object({
    name: text.min(1).describe('Name of the hotel / rental / campsite'),
    kind: z.enum(STAY_KINDS).catch('other').optional().describe('Type of accommodation'),
    about: text.optional().describe('What this place is like and why it was chosen, in 1–2 sentences'),
    address: text.optional().describe('Full street address'),
    location: LocationSchema.optional(),
    checkIn: time.optional().describe('Check-in time, 24h "HH:MM"'),
    checkOut: time.optional().describe('Check-out time the next morning, 24h "HH:MM"'),
    confirmation: text.optional().describe('Confirmation number, only if already booked'),
    phone: text.optional().describe('Phone number in international format'),
    url: text.optional().describe('Booking or official website'),
    cost: z.number().nonnegative().optional().describe('Cost for this night, for the whole group'),
    notes: text.optional().describe('Parking, breakfast, door codes, anything useful'),
  })
  .describe('Where we sleep at the end of this day.');

export const DaySchema = z
  .object({
    id: appManaged(text),
    date: isoDate.describe('Calendar date "YYYY-MM-DD". One day object per date.'),
    title: text.min(1).describe('Catchy title for the day, e.g. "Big Sur, the main event"'),
    summary: text.optional().describe('2–3 sentences on the vibe and the plan for the day'),
    from: text.optional().describe('Where the day starts, e.g. "Carmel-by-the-Sea, CA"'),
    to: text.optional().describe('Where the day ends'),
    distanceKm: z.number().nonnegative().optional().describe('Total driving distance for the day, km'),
    driveHours: z.number().nonnegative().optional().describe('Total pure driving time, decimal hours (e.g. 3.5)'),
    image: text.optional().describe('Direct https image URL representing the day (optional)'),
    stops: z.array(StopSchema).default([]).describe('Stops in chronological order'),
    stay: StaySchema.optional(),
  })
  .describe('One calendar day of the trip.');

export const ChecklistItemSchema = z.object({
  id: appManaged(text),
  text: text.min(1).describe('The item or to-do, e.g. "International driving permit"'),
  category: text
    .default('General')
    .describe('Group name, e.g. "Documents", "Car", "Clothes", "Tech", "Bookings", "Health"'),
  done: appManaged(z.boolean()),
  doneBy: appManaged(text),
});

export const ContactSchema = z.object({
  name: text.min(1).describe('Who, e.g. "Roadside assistance" or "Hotel Seville"'),
  phone: text.optional().describe('Phone number in international format'),
  note: text.optional().describe('Short context'),
});

export const LinkSchema = z.object({
  label: text.min(1).describe('Link text'),
  url: text.min(1).describe('https URL'),
});

export const TripInputSchema = z
  .object({
    version: z.literal(1).default(1).describe('Format version. Always 1.'),
    title: text.min(1).describe('Trip name, e.g. "Pacific Coast Highway"'),
    subtitle: text.optional().describe('Short route line, e.g. "San Francisco → Los Angeles"'),
    emoji: text.optional().describe('One emoji that captures the trip'),
    coverImage: text.optional().describe('Direct https image URL for the cover (images.unsplash.com preferred)'),
    startDate: isoDate.describe('First day "YYYY-MM-DD"'),
    endDate: isoDate.describe('Last day "YYYY-MM-DD"'),
    travelers: z.array(text).default([]).describe('Names of the people traveling'),
    currency: text.length(3).default('USD').describe('ISO 4217 currency code for all costs, e.g. "EUR"'),
    summary: text.optional().describe('2–3 sentence overview of the whole trip'),
    tags: z.array(text).default([]).describe('Short themes, e.g. ["coast", "wine", "national parks"]'),
    budget: z
      .object({ total: z.number().nonnegative().optional().describe('Total budget for the trip') })
      .optional(),
    days: z
      .array(DaySchema)
      .min(1, 'A trip needs at least one day')
      .describe('Every calendar day from startDate to endDate, in order'),
    checklist: z
      .array(ChecklistItemSchema)
      .default([])
      .describe('Packing list and to-dos before leaving (15–30 items)'),
    contacts: z.array(ContactSchema).default([]).describe('Useful phone numbers'),
    links: z.array(LinkSchema).default([]).describe('Useful websites: road conditions, park passes, bookings…'),
    notes: text.optional().describe('Free-form notes shared by the travelers'),
  })
  .refine((t) => t.endDate >= t.startDate, {
    message: 'endDate must be on or after startDate',
    path: ['endDate'],
  })
  .describe('A Planny road trip plan.');

export type Location = z.infer<typeof LocationSchema>;
export type Stop = z.infer<typeof StopSchema> & { id: string };
export type Stay = z.infer<typeof StaySchema>;
export type Day = Omit<z.infer<typeof DaySchema>, 'stops' | 'id'> & { id: string; stops: Stop[] };
export type ChecklistItem = z.infer<typeof ChecklistItemSchema> & { id: string };
export type TripInput = z.input<typeof TripInputSchema>;
type ParsedTrip = z.output<typeof TripInputSchema>;

export type TripData = Omit<ParsedTrip, 'days' | 'checklist'> & {
  days: Day[];
  checklist: ChecklistItem[];
};

export type Trip = TripData & {
  id: string;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
};

export type TripSummary = Pick<
  Trip,
  'id' | 'title' | 'subtitle' | 'emoji' | 'coverImage' | 'startDate' | 'endDate' | 'travelers' | 'tags' | 'updatedAt'
> & { dayCount: number; stopCount: number; distanceKm: number };

/** Patch operations that both travelers can apply concurrently without overwriting each other. */
export const TripPatchSchema = z.discriminatedUnion('op', [
  z.object({ op: z.literal('toggleStop'), stopId: z.string(), done: z.boolean() }),
  z.object({ op: z.literal('toggleChecklist'), itemId: z.string(), done: z.boolean() }),
  z.object({ op: z.literal('addChecklist'), text: text.min(1), category: text.default('General') }),
  z.object({ op: z.literal('removeChecklist'), itemId: z.string() }),
  z.object({ op: z.literal('setNotes'), notes: z.string() }),
]);
export type TripPatch = z.input<typeof TripPatchSchema>;

export function shortId(): string {
  const bytes = new Uint8Array(6);
  globalThis.crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(36).padStart(2, '0')).join('').slice(0, 10);
}

/** Validates raw JSON and fills in ids/defaults. Throws a readable error. */
export function parseTrip(raw: unknown): TripData {
  const result = TripInputSchema.safeParse(raw);
  if (!result.success) {
    throw new TripValidationError(formatZodError(result.error));
  }
  const t = result.data;
  return {
    ...t,
    days: [...t.days]
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((d) => ({
        ...d,
        id: d.id || shortId(),
        // Stops keep the order they were written in (that's the plan's order).
        stops: d.stops.map((s) => ({ ...s, id: s.id || shortId() })),
      })),
    checklist: t.checklist.map((c) => ({ ...c, id: c.id || shortId() })),
  };
}

export class TripValidationError extends Error {
  constructor(public issues: string[]) {
    super(issues.join('\n'));
    this.name = 'TripValidationError';
  }
}

function formatZodError(err: z.ZodError): string[] {
  return err.issues.slice(0, 12).map((i) => `${i.path.join('.') || '(root)'}: ${i.message}`);
}

export function summarize(trip: Trip): TripSummary {
  return {
    id: trip.id,
    title: trip.title,
    subtitle: trip.subtitle,
    emoji: trip.emoji,
    coverImage: trip.coverImage,
    startDate: trip.startDate,
    endDate: trip.endDate,
    travelers: trip.travelers,
    tags: trip.tags,
    updatedAt: trip.updatedAt,
    dayCount: trip.days.length,
    stopCount: trip.days.reduce((n, d) => n + d.stops.length, 0),
    distanceKm: Math.round(trip.days.reduce((n, d) => n + (d.distanceKm ?? 0), 0)),
  };
}
