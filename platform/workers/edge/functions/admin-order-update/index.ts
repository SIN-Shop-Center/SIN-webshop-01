import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { loadEdgeEnv } from "../_shared/env.ts";
import { createServiceClient } from "../_shared/supabase.ts";
import { errorResponse, HttpError, jsonWithCors, parseJson, preflight } from "../_shared/http.ts";
import { publishOutbox } from "../_shared/events.ts";
import { requireAdmin } from "../_shared/auth.ts";

type AdminOrderUpdateRequest = {
  order_id: string;
  status?: string;
  carrier?: string;
  tracking_number?: string;
  tracking_url?: string;
};

serve(async (req) => {
  const env = loadEdgeEnv();
  const preflightResponse = preflight(req, env.corsAllowlist);
  if (preflightResponse) {
    return preflightResponse;
  }

  try {
    if (req.method !== "POST") {
      throw new HttpError(405, "method_not_allowed");
    }

    const sb = createServiceClient(env);
    const { userId } = await requireAdmin(sb, req);
    const payload = await parseJson<AdminOrderUpdateRequest>(req);

    if (!payload.order_id) {
      throw new HttpError(400, "missing_order_id");
    }

    const updateOrder: Record<string, unknown> = {};
    if (payload.status) {
      updateOrder.status = payload.status;
    }

    if (Object.keys(updateOrder).length > 0) {
      const { error } = await sb.from("orders").update(updateOrder).eq("id", payload.order_id);
      if (error) {
        throw new Error(`order_update_failed:${error.message}`);
      }
    }

    if (payload.tracking_number || payload.carrier || payload.tracking_url) {
      const shipmentValues = {
        order_id: payload.order_id,
        carrier: payload.carrier ?? "DHL",
        tracking_number: payload.tracking_number ?? null,
        tracking_url: payload.tracking_url ?? null,
        status: payload.status === "delivered" ? "delivered" : "in_transit",
      };

      const { data: existing } = await sb
        .from("shipments")
        .select("id")
        .eq("order_id", payload.order_id)
        .maybeSingle();

      if (existing?.id) {
        await sb.from("shipments").update(shipmentValues).eq("id", existing.id);
      } else {
        await sb.from("shipments").insert(shipmentValues);
      }

      await publishOutbox(sb, "shipment.updated", "order", payload.order_id, {
        order_id: payload.order_id,
        tracking_number: shipmentValues.tracking_number,
        tracking_url: shipmentValues.tracking_url,
        status: shipmentValues.status,
      });
    }

    await sb.from("admin_log").insert({
      admin_id: userId,
      action: "order_update",
      target_type: "order",
      target_id: payload.order_id,
      details: payload,
    });

    return jsonWithCors(req, 200, { ok: true, order_id: payload.order_id }, env.corsAllowlist);
  } catch (err) {
    return errorResponse(req, err, env.corsAllowlist);
  }
});
