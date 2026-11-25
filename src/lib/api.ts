import type { Trip, TripPatch, TripSummary } from '../../shared/trip';

export const UNAUTHORIZED_EVENT = 'planny:unauthorized';

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public details?: unknown,
  ) {
    super(message);
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(path, {
      ...init,
      credentials: 'same-origin',
      headers: init.body ? { 'content-type': 'application/json', ...init.headers } : init.headers,
    });
  } catch {
    throw new ApiError(0, 'You seem to be offline');
  }
  const body = res.headers.get('content-type')?.includes('json') ? await res.json() : null;
  if (!res.ok) {
    if (res.status === 401 && !path.startsWith('/api/auth')) window.dispatchEvent(new Event(UNAUTHORIZED_EVENT));
    throw new ApiError(res.status, body?.error ?? `Request failed (${res.status})`, body?.details);
  }
  return body as T;
}

const send = (method: string, body?: unknown): RequestInit => ({
  method,
  body: body === undefined ? undefined : JSON.stringify(body),
});

export const api = {
  me: () => request<{ user: string | null; users: string[] }>('/api/auth/me'),
  login: (name: string, pin: string) => request<{ user: string }>('/api/auth/login', send('POST', { name, pin })),
  logout: () => request<{ ok: true }>('/api/auth/logout', send('POST')),

  listTrips: () => request<TripSummary[]>('/api/trips'),
  getTrip: (id: string) => request<Trip>(`/api/trips/${encodeURIComponent(id)}`),
  createTrip: (json: unknown) => request<Trip>('/api/trips', send('POST', json)),
  replaceTrip: (id: string, json: unknown) => request<Trip>(`/api/trips/${encodeURIComponent(id)}`, send('PUT', json)),
  patchTrip: (id: string, patch: TripPatch) =>
    request<Trip>(`/api/trips/${encodeURIComponent(id)}`, send('PATCH', patch)),
  deleteTrip: (id: string) => request<{ ok: true }>(`/api/trips/${encodeURIComponent(id)}`, send('DELETE')),
};
