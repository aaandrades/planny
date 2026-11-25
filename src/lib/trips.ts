import type { Trip, TripPatch, TripSummary } from '../../shared/trip';
import { api, ApiError } from './api';
import { mutate, peek, revalidate, useResource } from './store';

export const tripKey = (id: string) => `trip:${id}`;
const QUEUE_KEY = 'planny:v1:queue';

interface QueuedPatch {
  tripId: string;
  patch: TripPatch;
  user: string;
}

export function useTrips() {
  return useResource<TripSummary[]>('trips', api.listTrips, { pollMs: 60_000 });
}

export function useTrip(id: string) {
  return useResource<Trip>(tripKey(id), async () => withPending(await api.getTrip(id)));
}

export function refreshTrips() {
  return revalidate('trips', api.listTrips).catch(() => undefined);
}

/** Applies a patch locally — used for optimistic UI and for replaying offline edits. */
export function applyPatch(trip: Trip, patch: TripPatch, user: string): Trip {
  switch (patch.op) {
    case 'toggleStop':
      return {
        ...trip,
        days: trip.days.map((d) => ({
          ...d,
          stops: d.stops.map((s) =>
            s.id === patch.stopId ? { ...s, done: patch.done, doneBy: patch.done ? user : undefined } : s,
          ),
        })),
      };
    case 'toggleChecklist':
      return {
        ...trip,
        checklist: trip.checklist.map((c) =>
          c.id === patch.itemId ? { ...c, done: patch.done, doneBy: patch.done ? user : undefined } : c,
        ),
      };
    case 'addChecklist':
      return {
        ...trip,
        checklist: [
          ...trip.checklist,
          { id: `tmp-${Date.now()}`, text: patch.text, category: patch.category ?? 'General' },
        ],
      };
    case 'removeChecklist':
      return { ...trip, checklist: trip.checklist.filter((c) => c.id !== patch.itemId) };
    case 'setNotes':
      return { ...trip, notes: patch.notes };
  }
}

function readQueue(): QueuedPatch[] {
  try {
    return JSON.parse(localStorage.getItem(QUEUE_KEY) ?? '[]');
  } catch {
    return [];
  }
}
function writeQueue(q: QueuedPatch[]) {
  try {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(q));
  } catch {
    /* ignore */
  }
}

export const pendingCount = () => readQueue().length;

/** Re-apply edits that haven't reached the server yet on top of fetched data. */
function withPending(trip: Trip): Trip {
  return readQueue()
    .filter((q) => q.tripId === trip.id)
    .reduce((t, q) => applyPatch(t, q.patch, q.user), trip);
}

/**
 * Optimistic patch. If you're offline (hello, desert highway) it's queued and
 * replayed automatically when the connection comes back.
 */
export async function patchTrip(id: string, patch: TripPatch, user: string): Promise<void> {
  const key = tripKey(id);
  const prev = peek<Trip>(key);
  mutate<Trip>(key, (t) => (t ? applyPatch(t, patch, user) : t));
  try {
    const fresh = await api.patchTrip(id, patch);
    mutate<Trip>(key, withPending(fresh));
  } catch (err) {
    if (err instanceof ApiError && err.status === 0) {
      writeQueue([...readQueue(), { tripId: id, patch, user }]);
      return;
    }
    mutate<Trip>(key, prev);
    throw err;
  }
}

let flushing = false;
export async function flushQueue() {
  if (flushing || !navigator.onLine) return;
  flushing = true;
  try {
    let q = readQueue();
    while (q.length) {
      const [item] = q;
      try {
        const fresh = await api.patchTrip(item!.tripId, item!.patch);
        q = q.slice(1);
        writeQueue(q);
        mutate<Trip>(tripKey(item!.tripId), withPending(fresh));
      } catch (err) {
        if (err instanceof ApiError && err.status === 0) break; // still offline
        q = q.slice(1); // server rejected it (e.g. item deleted) — drop it
        writeQueue(q);
      }
    }
  } finally {
    flushing = false;
  }
}

if (typeof window !== 'undefined') {
  window.addEventListener('online', () => void flushQueue());
  window.setTimeout(() => void flushQueue(), 1500);
}
