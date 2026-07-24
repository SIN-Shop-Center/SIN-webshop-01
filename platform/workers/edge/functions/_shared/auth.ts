import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { HttpError } from "./http.ts";

function bearerToken(req: Request): string | null {
  const auth = req.headers.get("authorization");
  if (!auth) {
    return null;
  }

  if (!auth.toLowerCase().startsWith("bearer ")) {
    return null;
  }

  return auth.slice(7).trim();
}

export function isWorkerCall(req: Request, sharedSecret?: string): boolean {
  if (!sharedSecret) {
    return false;
  }

  const token = req.headers.get("x-worker-secret");
  return token === sharedSecret;
}

export async function resolveUserId(sb: SupabaseClient, req: Request): Promise<string | null> {
  const token = bearerToken(req);
  if (!token) {
    return null;
  }

  const { data, error } = await sb.auth.getUser(token);
  if (error || !data.user) {
    throw new HttpError(401, "invalid_token");
  }

  return data.user.id;
}

export async function requireAdmin(sb: SupabaseClient, req: Request): Promise<{ userId: string }> {
  const userId = await resolveUserId(sb, req);
  if (!userId) {
    throw new HttpError(401, "missing_token");
  }

  const { data, error } = await sb
    .from("profiles")
    .select("is_admin, role")
    .eq("id", userId)
    .single();

  if (error || !data) {
    throw new HttpError(403, "admin_required");
  }

  const role = typeof data.role === "string" ? data.role : "";
  if (data.is_admin !== true && role !== "admin" && role !== "ops") {
    throw new HttpError(403, "admin_required");
  }

  return { userId };
}
