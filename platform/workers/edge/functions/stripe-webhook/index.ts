import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.14.0";
import { loadEdgeEnv } from "../_shared/env.ts";
import { createServiceClient } from "../_shared/supabase.ts";
import { errorResponse, HttpError, jsonWithCors } from "../_shared/http.ts";
import { finishInboxEvent, publishOutbox, startInboxEvent } from "../_shared/events.ts";

serve(async (req) => {
  const env = loadEdgeEnv();

  try {
    if (req.method !== "POST") {
      throw new HttpError(405, "method_not_allowed");
    }

    if (!env.stripeSecretKey || !env.stripeWebhookSecret) {
      throw new HttpError(500, "missing_stripe_webhook_configuration");
    }

    const stripe = new Stripe(env.stripeSecretKey, { apiVersion: "2024-12-18.acacia" });
    const rawBody = await req.text();
    const signature = req.headers.get("stripe-signature");
    if (!signature) {
      throw new HttpError(400, "missing_stripe_signature");
    }

    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(rawBody, signature, env.stripeWebhookSecret);
    } catch (_err) {
      throw new HttpError(400, "invalid_stripe_signature");
    }

    const sb = createServiceClient(env);
    const inbox = await startInboxEvent(sb, event.id, event.type, event as unknown as Record<string, unknown>);
    if (inbox.duplicate) {
      return jsonWithCors(req, 200, { received: true, duplicate: true }, env.corsAllowlist);
    }

    try {
      if (event.type === "checkout.session.completed") {
        const session = event.data.object as Stripe.Checkout.Session;
        const orderId = session.metadata?.order_id;
        if (!orderId) {
          throw new HttpError(400, "missing_order_id_metadata");
        }

        const { error } = await sb
          .from("orders")
          .update({
            status: "paid",
            payment_provider: "stripe",
            payment_reference: session.id,
          })
          .eq("id", orderId);

        if (error) {
          throw new Error(`order_update_failed:${error.message}`);
        }

        await publishOutbox(sb, "payment.succeeded", "order", orderId, {
          order_id: orderId,
          payment_reference: session.id,
          provider: "stripe",
        });

        if (env.autoFulfill) {
          await sb.functions.invoke("fulfillment-run", { body: { order_id: orderId } });
        }
      }

      await finishInboxEvent(sb, inbox.id, true);
    } catch (err) {
      const message = err instanceof Error ? err.message : "unknown_error";
      await finishInboxEvent(sb, inbox.id, false, message);
      throw err;
    }

    return jsonWithCors(req, 200, { received: true }, env.corsAllowlist);
  } catch (err) {
    return errorResponse(req, err, env.corsAllowlist);
  }
});
