import { parseTrip, shortId, summarize, TripValidationError } from '../../shared/trip.js';
import { requireUser } from '../_lib/auth.js';
import { toTrip, trips, type TripDoc } from '../_lib/db.js';
import { HttpError, json, readJson, route } from '../_lib/http.js';

export const GET = route(async (req) => {
  requireUser(req);
  const docs = await (await trips()).find({}).sort({ startDate: -1 }).limit(200).toArray();
  return json(docs.map((d) => summarize(toTrip(d))));
});

export const POST = route(async (req) => {
  const user = requireUser(req);
  const raw = await readJson(req);
  let data;
  try {
    data = parseTrip(raw);
  } catch (err) {
    if (err instanceof TripValidationError) throw new HttpError(422, 'Trip JSON is not valid', err.issues);
    throw err;
  }
  const now = new Date().toISOString();
  const doc: TripDoc = {
    _id: `${slugify(data.title)}-${shortId().slice(0, 4)}`,
    ...data,
    createdAt: now,
    updatedAt: now,
    createdBy: user,
  };
  await (await trips()).insertOne(doc);
  return json(toTrip(doc), 201);
});

function slugify(s: string): string {
  return (
    s
      .normalize('NFKD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 40) || 'trip'
  );
}
