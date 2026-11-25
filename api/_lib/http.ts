export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
    public details?: unknown,
  ) {
    super(message);
  }
}

export function json(data: unknown, status = 200, headers: HeadersInit = {}): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      ...headers,
    },
  });
}

export async function readJson<T = unknown>(req: Request): Promise<T> {
  try {
    return (await req.json()) as T;
  } catch {
    throw new HttpError(400, 'Body must be valid JSON');
  }
}

type Handler = (req: Request) => Promise<Response>;

/** Wraps a handler with uniform error handling. */
export function route(fn: Handler): Handler {
  return async (req) => {
    try {
      return await fn(req);
    } catch (err) {
      if (err instanceof HttpError) {
        return json({ error: err.message, details: err.details }, err.status);
      }
      console.error(err);
      return json({ error: 'Something went wrong on our side' }, 500);
    }
  };
}

/** Last path segment, e.g. /api/trips/abc -> "abc" */
export function lastSegment(req: Request): string {
  const parts = new URL(req.url).pathname.split('/').filter(Boolean);
  return decodeURIComponent(parts[parts.length - 1] ?? '');
}
