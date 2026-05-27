import { corsHeaders } from "./cors.ts";

export function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}

export function badRequest(message: string, details?: unknown) {
  return json({ error: message, details }, 400);
}

export function unauthorized(message = "Unauthorized") {
  return json({ error: message }, 401);
}

export function notFound(message = "Not found") {
  return json({ error: message }, 404);
}

export function serverError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  return json({ error: message }, 500);
}
