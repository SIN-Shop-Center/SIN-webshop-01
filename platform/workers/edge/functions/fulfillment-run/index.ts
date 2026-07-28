import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { loadEdgeEnv } from "../_shared/env.ts";
import { createServiceClient } from "../_shared/supabase.ts";
import { errorResponse, HttpError, jsonWithCors, parseJson, preflight } from "../_shared/http.ts";
import { isWorkerCall, requireAdmin } from "../_shared/auth.ts";
import { publishOutbox } from "../_shared/events.ts";

type FulfillmentRequest = { order_id: string };

function trackingCode(): string {
  const timestamp = Date.now().toString().slice(-8);
  const rand = crypto.randomUUID().split("-")[0].toUpperCase();
  return `TRK-${timestamp}-${rand}`;
}

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
    if (!isWorkerCall(req, env.workerSharedSecret)) {
      await requireAdmin(sb, req);
    }

    const payload = await parseJson<FulfillmentRequest>(req);
    if (!payload.order_id) {
      throw new HttpError(400, "missing_order_id");
    }

    const { data: order, error: orderError } = await sb
      .from("orders")
      .select("id, status")
      .eq("id", payload.order_id)
      .single();

    if (orderError || !order) {
      throw new HttpError(404, "order_not_found");
    }

    await sb.from("orders").update({ status: "processing" }).eq("id", payload.order_id);

    await publishOutbox(sb, "fulfillment.started", "order", payload.order_id, {
      order_id: payload.order_id,
      source: "edge.fulfillment-run",
    });

    const code = trackingCode();
    const trackingUrl = `https://tracking.example.com/${code}`;

    const { data: existingShipment } = await sb
      .from("shipments")
      .select("id")
      .eq("order_id", payload.order_id)
      .maybeSingle();

    if (existingShipment?.id) {
      await sb
        .from("shipments")
        .update({
          carrier: "DHL",
          tracking_number: code,
          tracking_url: trackingUrl,
          status: "label_created",
          shipped_at: new Date().toISOString(),
        })
        .eq("id", existingShipment.id);
    } else {
      await sb.from("shipments").insert({
        order_id: payload.order_id,
        carrier: "DHL",
        tracking_number: code,
        tracking_url: trackingUrl,
        status: "label_created",
        shipped_at: new Date().toISOString(),
      });
    }

    await sb.from("orders").update({ status: "shipped" }).eq("id", payload.order_id);

    await publishOutbox(sb, "shipment.updated", "order", payload.order_id, {
      order_id: payload.order_id,
      tracking_number: code,
      tracking_url: trackingUrl,
      status: "label_created",
    });

    return jsonWithCors(req, 200, { ok: true, order_id: payload.order_id, tracking_number: code }, env.corsAllowlist);
  } catch (err) {
    return errorResponse(req, err, env.corsAllowlist);
  }
});
