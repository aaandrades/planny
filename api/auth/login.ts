import { checkPin, sessionCookie } from '../_lib/auth.js';
import { HttpError, json, readJson, route } from '../_lib/http.js';

export const POST = route(async (req) => {
  const body = await readJson<{ name?: string; pin?: string }>(req);
  const name = checkPin(String(body.name ?? ''), String(body.pin ?? ''));
  if (!name) {
    await new Promise((r) => setTimeout(r, 600)); // slow down guessing
    throw new HttpError(401, 'That PIN doesn’t match');
  }
  return json({ user: name }, 200, { 'set-cookie': sessionCookie(req, name) });
});
