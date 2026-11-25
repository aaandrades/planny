import { createHmac, timingSafeEqual } from 'node:crypto';
import { HttpError } from './http.js';

const COOKIE = 'planny_session';
const MAX_AGE_S = 60 * 60 * 24 * 180; // 180 days

interface User {
  name: string;
  pin: string;
}

/** PLANNY_USERS="Andres:1234,Wife:5678" */
export function getUsers(): User[] {
  return (process.env.PLANNY_USERS ?? '')
    .split(',')
    .map((pair) => pair.trim())
    .filter(Boolean)
    .map((pair) => {
      const idx = pair.lastIndexOf(':');
      return { name: pair.slice(0, idx).trim(), pin: pair.slice(idx + 1).trim() };
    })
    .filter((u) => u.name && u.pin);
}

function secret(): string {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 16) throw new HttpError(500, 'SESSION_SECRET must be set (16+ chars)');
  return s;
}

function sign(payload: string): string {
  return createHmac('sha256', secret()).update(payload).digest('base64url');
}

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}

export function checkPin(name: string, pin: string): string | null {
  const user = getUsers().find((u) => u.name.toLowerCase() === name.trim().toLowerCase());
  if (!user || !safeEqual(user.pin, pin.trim())) return null;
  return user.name;
}

export function sessionCookie(req: Request, name: string): string {
  const payload = Buffer.from(JSON.stringify({ u: name, exp: Date.now() + MAX_AGE_S * 1000 })).toString('base64url');
  const token = `${payload}.${sign(payload)}`;
  return cookie(req, token, MAX_AGE_S);
}

export function clearCookie(req: Request): string {
  return cookie(req, '', 0);
}

function cookie(req: Request, value: string, maxAge: number): string {
  const secure = new URL(req.url).protocol === 'https:' ? '; Secure' : '';
  return `${COOKIE}=${value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secure}`;
}

/** Returns the logged-in user's name, or null. */
export function getSession(req: Request): string | null {
  const raw = req.headers.get('cookie') ?? '';
  const match = raw.split(/;\s*/).find((c) => c.startsWith(`${COOKIE}=`));
  if (!match) return null;
  const [payload, sig] = match.slice(COOKIE.length + 1).split('.');
  if (!payload || !sig || !safeEqual(sign(payload), sig)) return null;
  try {
    const { u, exp } = JSON.parse(Buffer.from(payload, 'base64url').toString()) as { u: string; exp: number };
    if (Date.now() > exp) return null;
    // User removed from env => session no longer valid.
    return getUsers().some((x) => x.name === u) ? u : null;
  } catch {
    return null;
  }
}

export function requireUser(req: Request): string {
  const user = getSession(req);
  if (!user) throw new HttpError(401, 'Please log in');
  return user;
}
