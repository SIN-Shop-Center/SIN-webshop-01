/**
 * Purpose: Email dispatch functions — order lifecycle + welcome, with Resend + email_log
 * Docs: emails.doc.md
 *
 * Each function fetches order data from Supabase, renders the template,
 * sends via Resend, and logs the result to shop.email_log. Errors are
 * caught and logged — never thrown — so callers never block.
 */

import 'server-only'

import { createAdminClient } from '@/lib/supabase/admin'
import { FROM_EMAIL, getResend } from '@/lib/email-constants'
import {
  orderConfirmationHtml,
  orderShippedHtml,
  orderDeliveredHtml,
  welcomeHtml,
  type OrderData,
  type OrderItem,
} from '@/lib/emails/templates'

type EmailLogStatus = 'sent' | 'failed'

async function logEmail(
  orderId: string | null,
  emailType: string,
  recipient: string,
  status: EmailLogStatus,
  errorMessage?: string,
) {
  try {
    const supabase = createAdminClient()
    await supabase.from('email_log').insert({
      order_id: orderId,
      email_type: emailType,
      recipient,
      status,
      error_message: errorMessage ?? null,
    })
  } catch (e) {
    console.error('[email] Failed to write email_log:', e)
  }
}

async function fetchOrder(orderId: string): Promise<OrderData | null> {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('orders')
    .select('id, items, amount_total, currency, email, shipping_address')
    .eq('id', orderId)
    .single()

  if (error || !data) {
    console.error('[email] Order not found:', orderId, error)
    return null
  }

  return {
    orderId: data.id,
    items: data.items as OrderItem[],
    totalCents: data.amount_total,
    currency: data.currency ?? 'EUR',
    email: data.email,
    shippingAddress: data.shipping_address as OrderData['shippingAddress'],
  }
}

function shortId(id: string): string {
  return id.slice(0, 8).toUpperCase()
}

export async function sendOrderConfirmation(orderId: string): Promise<void> {
  const order = await fetchOrder(orderId)
  if (!order || !order.email) return

  const emailType = 'order_confirmation'
  try {
    const html = orderConfirmationHtml(order)
    await getResend().emails.send({
      from: FROM_EMAIL,
      to: order.email,
      subject: `Bestellbestätigung ${shortId(orderId)}`,
      html,
    })
    await logEmail(orderId, emailType, order.email, 'sent')
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Unknown error'
    console.error('[email] Order confirmation failed:', msg)
    await logEmail(orderId, emailType, order.email, 'failed', msg)
  }
}

export async function sendOrderShipped(
  orderId: string,
  trackingUrl: string,
): Promise<void> {
  const order = await fetchOrder(orderId)
  if (!order || !order.email) return

  const emailType = 'order_shipped'
  try {
    const html = orderShippedHtml(order, trackingUrl)
    await getResend().emails.send({
      from: FROM_EMAIL,
      to: order.email,
      subject: `Deine Bestellung ${shortId(orderId)} wurde versendet`,
      html,
    })
    await logEmail(orderId, emailType, order.email, 'sent')
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Unknown error'
    console.error('[email] Shipping notification failed:', msg)
    await logEmail(orderId, emailType, order.email, 'failed', msg)
  }
}

export async function sendOrderDelivered(orderId: string): Promise<void> {
  const order = await fetchOrder(orderId)
  if (!order || !order.email) return

  const emailType = 'order_delivered'
  try {
    const html = orderDeliveredHtml(order)
    await getResend().emails.send({
      from: FROM_EMAIL,
      to: order.email,
      subject: `Deine Bestellung ${shortId(orderId)} wurde zugestellt`,
      html,
    })
    await logEmail(orderId, emailType, order.email, 'sent')
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Unknown error'
    console.error('[email] Delivery notification failed:', msg)
    await logEmail(orderId, emailType, order.email, 'failed', msg)
  }
}

export async function sendWelcome(
  userEmail: string,
  userName: string,
): Promise<void> {
  const emailType = 'welcome'
  try {
    const html = welcomeHtml(userName)
    await getResend().emails.send({
      from: FROM_EMAIL,
      to: userEmail,
      subject: 'Willkommen bei ShopSIN!',
      html,
    })
    await logEmail(null, emailType, userEmail, 'sent')
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Unknown error'
    console.error('[email] Welcome email failed:', msg)
    await logEmail(null, emailType, userEmail, 'failed', msg)
  }
}
