export class HttpError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };

export function corsHeaders(req: Request, allowlist: string[]): HeadersInit {
  const origin = req.headers.get("origin");
  const headers: Record<string, string> = {
    "Access-Control-Allow-Methods": "GET,POST,PATCH,PUT,DELETE,OPTIONS",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, stripe-signature, x-worker-secret",
    "Vary": "Origin",
  };

  if (origin && allowlist.includes(origin)) {
    headers["Access-Control-Allow-Origin"] = origin;
  }

  return headers;
}

export function preflight(req: Request, allowlist: string[]): Response | null {
  if (req.method !== "OPTIONS") {
    return null;
  }

  return new Response("ok", { headers: corsHeaders(req, allowlist) });
}

export async function parseJson<T>(req: Request): Promise<T> {
  try {
    return (await req.json()) as T;
  } catch (_err) {
    throw new HttpError(400, "invalid_json");
  }
}

export function jsonWithCors(req: Request, status: number, payload: JsonValue, allowlist: string[]): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      ...corsHeaders(req, allowlist),
      "content-type": "application/json",
    },
  });
}

export function errorResponse(req: Request, err: unknown, allowlist: string[]): Response {
  if (err instanceof HttpError) {
    return jsonWithCors(req, err.status, { error: err.message }, allowlist);
  }

  console.error("edge-fn error", err);
  return jsonWithCors(req, 500, { error: "internal_error" }, allowlist);
}
