import { getSession, getUsers } from '../_lib/auth.js';
import { json, route } from '../_lib/http.js';

/** Who am I + the names that can log in (for the login picker). */
export const GET = route(async (req) => {
  return json({ user: getSession(req), users: getUsers().map((u) => u.name) });
});
