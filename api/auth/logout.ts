import { clearCookie } from '../_lib/auth.js';
import { json, route } from '../_lib/http.js';

export const POST = route(async (req) => json({ ok: true }, 200, { 'set-cookie': clearCookie(req) }));
