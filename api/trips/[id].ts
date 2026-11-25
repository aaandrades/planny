import type { UpdateFilter } from 'mongodb';
import { parseTrip, shortId, TripPatchSchema, TripValidationError, type TripData } from '../../shared/trip.js';
import { requireUser } from '../_lib/auth.js';
import { toTrip, trips, type TripDoc } from '../_lib/db.js';
import { HttpError, json, lastSegment, readJson, route } from '../_lib/http.js';

export const GET = route(async (req) => {
  requireUser(req);
  const doc = await (await trips()).findOne({ _id: lastSegment(req) });
  if (!doc) throw new HttpError(404, 'Trip not found');
  return json(toTrip(doc));
});

/** Replace the whole plan (e.g. re-import an updated JSON). Progress is kept for matching ids. */
export const PUT = route(async (req) => {
  requireUser(req);
  const id = lastSegment(req);
  const col = await trips();
  const existing = await col.findOne({ _id: id });
  if (!existing) throw new HttpError(404, 'Trip not found');

  let data: TripData;
  try {
    data = parseTrip(await readJson(req));
  } catch (err) {
    if (err instanceof TripValidationError) throw new HttpError(422, 'Trip JSON is not valid', err.issues);
    throw err;
  }

  const doneStops = new Map(existing.days.flatMap((d) => d.stops).map((s) => [s.id, s]));
  const doneItems = new Map(existing.checklist.map((c) => [c.id, c]));
  for (const day of data.days) {
    for (const stop of day.stops) {
      const prev = doneStops.get(stop.id);
      if (prev?.done && stop.done === undefined) Object.assign(stop, { done: true, doneBy: prev.doneBy });
    }
  }
  for (const item of data.checklist) {
    const prev = doneItems.get(item.id);
    if (prev?.done && item.done === undefined) Object.assign(item, { done: true, doneBy: prev.doneBy });
  }

  const doc: TripDoc = {
    _id: id,
    ...data,
    createdAt: existing.createdAt,
    createdBy: existing.createdBy,
    updatedAt: new Date().toISOString(),
  };
  await col.replaceOne({ _id: id }, doc);
  return json(toTrip(doc));
});

/** Small, conflict-free edits so both of you can tick things off at the same time. */
export const PATCH = route(async (req) => {
  const user = requireUser(req);
  const id = lastSegment(req);
  const parsed = TripPatchSchema.safeParse(await readJson(req));
  if (!parsed.success) throw new HttpError(400, 'Invalid patch', parsed.error.issues);
  const p = parsed.data;
  const updatedAt = new Date().toISOString();

  let update: UpdateFilter<TripDoc>;
  let arrayFilters: Record<string, unknown>[] | undefined;

  switch (p.op) {
    case 'toggleStop':
      update = toggle('days.$[].stops.$[s]', p.done, user, updatedAt);
      arrayFilters = [{ 's.id': p.stopId }];
      break;
    case 'toggleChecklist':
      update = toggle('checklist.$[c]', p.done, user, updatedAt);
      arrayFilters = [{ 'c.id': p.itemId }];
      break;
    case 'addChecklist':
      update = {
        $push: { checklist: { id: shortId(), text: p.text, category: p.category } },
        $set: { updatedAt },
      } as UpdateFilter<TripDoc>;
      break;
    case 'removeChecklist':
      update = { $pull: { checklist: { id: p.itemId } }, $set: { updatedAt } } as UpdateFilter<TripDoc>;
      break;
    case 'setNotes':
      update = { $set: { notes: p.notes, updatedAt } };
      break;
  }

  const doc = await (await trips()).findOneAndUpdate({ _id: id }, update, {
    arrayFilters,
    returnDocument: 'after',
  });
  if (!doc) throw new HttpError(404, 'Trip not found');
  return json(toTrip(doc));
});

function toggle(path: string, done: boolean, user: string, updatedAt: string): UpdateFilter<TripDoc> {
  return (
    done
      ? { $set: { [`${path}.done`]: true, [`${path}.doneBy`]: user, updatedAt } }
      : { $set: { [`${path}.done`]: false, updatedAt }, $unset: { [`${path}.doneBy`]: '' } }
  ) as UpdateFilter<TripDoc>;
}

export const DELETE = route(async (req) => {
  requireUser(req);
  const res = await (await trips()).deleteOne({ _id: lastSegment(req) });
  if (!res.deletedCount) throw new HttpError(404, 'Trip not found');
  return json({ ok: true });
});
