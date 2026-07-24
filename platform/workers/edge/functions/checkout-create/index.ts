import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.14.0";
import { loadEdgeEnv } from "../_shared/env.ts";
import { createServiceClient } from "../_shared/supabase.ts";
import { errorResponse, HttpError, jsonWithCors, parseJson, preflight } from "../_shared/http.ts";
import { publishOutbox } from "../_shared/events.ts";
import { resolveUserId } from "../_shared/auth.ts";
import type { CheckoutCreateRequest } from "../_shared/types.ts";

function validateInput(payload: CheckoutCreateRequest): void {
  if (!payload.email || !payload.shipping_address || !Array.isArray(payload.items) || payload.items.length === 0) {
    throw new HttpError(400, "missing_required_fields");
  }

  for (const item of payload.items) {
    if (!item.sku || !item.title || item.unit_price_amount <= 0 || item.quantity <= 0) {
      throw new HttpError(400, "invalid_item_payload");
    }
  }
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

    if (!env.stripeSecretKey) {
      throw new HttpError(500, "missing_env:STRIPE_SECRET_KEY");
    }
    if (!env.siteUrl) {
      throw new HttpError(500, "missing_env:SITE_URL");
    }

    const sb = createServiceClient(env);
    const userId = await resolveUserId(sb, req);
    if (!userId) {
      throw new HttpError(401, "customer_auth_required");
    }

    const payload = await parseJson<CheckoutCreateRequest>(req);
    validateInput(payload);

    const { data: address, error: addressError } = await sb
      .from("addresses")
      .insert({
        user_id: userId,
        first_name: payload.shipping_address.first_name,
        last_name: payload.shipping_address.last_name,
        street1: payload.shipping_address.street1,
        street2: payload.shipping_address.street2 ?? null,
        city: payload.shipping_address.city,
        zip: payload.shipping_address.zip,
        country: payload.shipping_address.country,
        phone: payload.shipping_address.phone ?? null,
        is_default: false,
      })
      .select("id")
      .single();

    if (addressError || !address) {
      throw new Error(`address_insert_failed:${addressError?.message ?? "unknown"}`);
    }

    const subtotal = payload.items.reduce((acc, item) => acc + item.unit_price_amount * item.quantity, 0);
    const shippingAmount = 0;
    const taxAmount = Math.round(subtotal * 0.19);
    const totalAmount = subtotal + shippingAmount;

    const { data: order, error: orderError } = await sb
      .from("orders")
      .insert({
        user_id: userId,
        email: payload.email,
        status: "payment_pending",
        currency: payload.currency ?? "EUR",
        subtotal_amount: subtotal,
        shipping_amount: shippingAmount,
        tax_amount: taxAmount,
        total_amount: totalAmount,
        shipping_method: payload.shipping_method ?? "express",
        shipping_address_id: address.id,
      })
      .select("id")
      .single();

    if (orderError || !order) {
      throw new Error(`order_insert_failed:${orderError?.message ?? "unknown"}`);
    }

    const { error: itemsError } = await sb.from("order_items").insert(
      payload.items.map((item) => ({
        order_id: order.id,
        sku: item.sku,
        title: item.title,
        variant: item.variant,
        unit_price_amount: item.unit_price_amount,
        quantity: item.quantity,
        image_url: item.image_url ?? null,
      })),
    );

    if (itemsError) {
      throw new Error(`order_items_insert_failed:${itemsError.message}`);
    }

    await publishOutbox(sb, "order.created", "order", order.id, {
      order_id: order.id,
      email: payload.email,
      item_count: payload.items.length,
      total_amount: totalAmount,
      currency: payload.currency ?? "EUR",
    });

    const stripe = new Stripe(env.stripeSecretKey, { apiVersion: "2024-12-18.acacia" });
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      customer_email: payload.email,
      line_items: payload.items.map((item) => ({
        price_data: {
          currency: (payload.currency ?? "EUR").toLowerCase(),
          product_data: { name: `${item.title} - ${item.variant}` },
          unit_amount: item.unit_price_amount,
        },
        quantity: item.quantity,
      })),
      metadata: { order_id: order.id },
      success_url: `${env.siteUrl}/order-confirmation?order_id=${order.id}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${env.siteUrl}/checkout?cancelled=true`,
    });

    if (!session.id || !session.url) {
      throw new Error("stripe_session_creation_failed");
    }

    await sb
      .from("orders")
      .update({
        payment_provider: "stripe",
        payment_reference: session.id,
      })
      .eq("id", order.id);

    return jsonWithCors(req, 200, { order_id: order.id, checkout_url: session.url }, env.corsAllowlist);
  } catch (err) {
    return errorResponse(req, err, env.corsAllowlist);
  }
});
