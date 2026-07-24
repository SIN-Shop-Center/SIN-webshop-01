import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { loadEdgeEnv } from "../_shared/env.ts";
import { createServiceClient } from "../_shared/supabase.ts";
import { errorResponse, HttpError, jsonWithCors, preflight } from "../_shared/http.ts";
import { isWorkerCall } from "../_shared/auth.ts";
import { publishOutbox } from "../_shared/events.ts";

type ShipmentRow = {
  id: string;
  order_id: string;
  tracking_number: string;
  tracking_url: string | null;
  status: string;
};

function mapEasyPostStatus(status: string): string {
  if (status === "delivered") return "delivered";
  if (status === "in_transit" || status === "out_for_delivery") return "in_transit";
  if (status === "error" || status === "failure") return "exception";
  return "label_created";
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

    if (!isWorkerCall(req, env.workerSharedSecret)) {
      throw new HttpError(401, "worker_secret_required");
    }

    const easyPostKey = Deno.env.get("EASYPOST_API_KEY");
    if (!easyPostKey) {
      throw new HttpError(500, "missing_env:EASYPOST_API_KEY");
    }

    const sb = createServiceClient(env);
    const { data: shipments, error } = await sb
      .from("shipments")
      .select("id, order_id, tracking_number, tracking_url, status")
      .neq("status", "delivered")
      .not("tracking_number", "is", null);

    if (error) {
      throw new Error(`shipments_query_failed:${error.message}`);
    }

    let updated = 0;
    for (const shipment of (shipments ?? []) as ShipmentRow[]) {
      const res = await fetch(`https://api.easypost.com/v2/trackers?tracking_code=${shipment.tracking_number}`, {
        headers: { Authorization: `Basic ${btoa(`${easyPostKey}:`)}` },
      });

      if (!res.ok) {
        continue;
      }

      const payload = await res.json();
      const tracker = payload.trackers?.[0];
      if (!tracker?.status) {
        continue;
      }

      const mapped = mapEasyPostStatus(tracker.status);
      if (mapped === shipment.status && tracker.public_url === shipment.tracking_url) {
        continue;
      }

      const updatePayload: Record<string, unknown> = {
        status: mapped,
        tracking_url: tracker.public_url || shipment.tracking_url,
      };

      if (mapped === "delivered") {
        updatePayload.delivered_at = new Date().toISOString();
        await sb.from("orders").update({ status: "delivered" }).eq("id", shipment.order_id);
      }

      await sb.from("shipments").update(updatePayload).eq("id", shipment.id);
      await publishOutbox(sb, "shipment.updated", "order", shipment.order_id, {
        order_id: shipment.order_id,
        shipment_id: shipment.id,
        status: mapped,
        tracking_url: updatePayload.tracking_url,
      });

      updated += 1;
    }

    return jsonWithCors(req, 200, { ok: true, updated }, env.corsAllowlist);
  } catch (err) {
    return errorResponse(req, err, env.corsAllowlist);
  }
});
