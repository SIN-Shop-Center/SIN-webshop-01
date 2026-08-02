import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { loadEdgeEnv } from "../_shared/env.ts";
import { createServiceClient } from "../_shared/supabase.ts";
import { errorResponse, HttpError, jsonWithCors, preflight } from "../_shared/http.ts";
import { requireAdmin } from "../_shared/auth.ts";

serve(async (req) => {
  const env = loadEdgeEnv();
  const preflightResponse = preflight(req, env.corsAllowlist);
  if (preflightResponse) {
    return preflightResponse;
  }

  try {
    if (req.method !== "GET") {
      throw new HttpError(405, "method_not_allowed");
    }

    const sb = createServiceClient(env);
    await requireAdmin(sb, req);

    const url = new URL(req.url);
    const limit = Math.min(Number(url.searchParams.get("limit") ?? "100"), 200);

    const { data, error } = await sb
      .from("orders")
      .select("*, order_items(*), addresses!shipping_address_id(*), shipments(*)")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      throw new Error(`orders_query_failed:${error.message}`);
    }

    return jsonWithCors(req, 200, { orders: data ?? [] }, env.corsAllowlist);
  } catch (err) {
    return errorResponse(req, err, env.corsAllowlist);
  }
});
