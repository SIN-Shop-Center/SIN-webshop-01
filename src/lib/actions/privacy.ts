// Purpose: Account anonymization and portable data export (GDPR Art. 17/20).

'use server'

import { redirect } from 'next/navigation'

import { checkRateLimit, RateLimitError } from '@/lib/rate-limit'
import {
  createAdminClient,
  createPublicAdminClient,
} from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

const CONFIRMATION_TEXT = 'LÖSCHEN'
const EXPORT_BUCKET = 'data-exports'
const EXPORT_URL_TTL_SECONDS = 15 * 60

async function removeExistingExports(userId: string): Promise<void> {
  const admin = createAdminClient()
  const folder = `exports/${userId}`
  const { data, error } = await admin.storage
    .from(EXPORT_BUCKET)
    .list(folder, { limit: 1000 })

  if (error) {
    // A missing bucket means there cannot be old export files to retain.
    if (/not found|does not exist/i.test(error.message)) return
    throw new Error(`Alte Exportdateien konnten nicht geprüft werden: ${error.message}`)
  }

  const paths = (data ?? [])
    .filter((entry) => entry.name && entry.id)
    .map((entry) => `${folder}/${entry.name}`)
  if (paths.length === 0) return

  const { error: removeError } = await admin.storage.from(EXPORT_BUCKET).remove(paths)
  if (removeError) {
    throw new Error(`Alte Exportdateien konnten nicht gelöscht werden: ${removeError.message}`)
  }
}

export async function deleteMyAccount(confirmation: string) {
  if (confirmation !== CONFIRMATION_TEXT) {
    throw new Error(`Bestätigung fehlt — tippe "${CONFIRMATION_TEXT}".`)
  }

  const session = await createClient()
  const {
    data: { user },
  } = await session.auth.getUser()
  if (!user?.email) throw new Error('Nicht eingeloggt.')

  try {
    await checkRateLimit('account-delete', { limit: 3, windowSec: 24 * 60 * 60 })
  } catch (error) {
    if (error instanceof RateLimitError) {
      throw new Error('Zu viele Löschversuche. Bitte versuche es später erneut.')
    }
    throw error
  }

  const admin = createAdminClient()

  // Remove generated exports before the identity is deleted.
  await removeExistingExports(user.id)

  const { error: anonymizeError } = await admin.rpc('anonymize_customer_account', {
    p_user_id: user.id,
    p_email: user.email,
  })
  if (anonymizeError) {
    throw new Error(`Kontodaten konnten nicht vollständig anonymisiert werden: ${anonymizeError.message}`)
  }

  const { error: authError } = await admin.auth.admin.deleteUser(user.id)
  if (authError) {
    // The data is already anonymized. A repeated deletion attempt can safely
    // finish removing the remaining auth identity.
    throw new Error(`Das Konto wurde anonymisiert, aber der Login konnte nicht entfernt werden: ${authError.message}`)
  }

  await session.auth.signOut()
  redirect('/')
}

function assertQuery(error: { message: string } | null, label: string): void {
  if (error) throw new Error(`${label}: ${error.message}`)
}

export async function exportMyData() {
  try {
    await checkRateLimit('privacy-export', { limit: 3, windowSec: 24 * 60 * 60 })
  } catch (error) {
    if (error instanceof RateLimitError) {
      throw new Error('Zu viele Exportanfragen. Bitte versuche es später erneut.')
    }
    throw error
  }

  const session = await createClient()
  const {
    data: { user },
  } = await session.auth.getUser()
  if (!user?.email) throw new Error('Nicht eingeloggt.')

  const shop = createAdminClient()
  const publicAdmin = createPublicAdminClient()

  const [profile, customer, orders, wishlist, addresses, contacts, returns, newsletter] =
    await Promise.all([
      publicAdmin.from('profiles').select('*').eq('id', user.id).maybeSingle(),
      publicAdmin.from('customers').select('*').eq('auth_user_id', user.id).maybeSingle(),
      shop.from('orders').select('*').eq('user_id', user.id).order('created_at'),
      shop.from('wishlist_items').select('*').eq('user_id', user.id).order('created_at'),
      shop.from('customer_addresses').select('*').eq('user_id', user.id).order('created_at'),
      shop.from('contact_messages').select('*').eq('user_id', user.id).order('created_at'),
      shop.from('return_requests').select('*').eq('user_id', user.id).order('created_at'),
      shop
        .from('newsletter_subscribers')
        .select('email, status, confirmation_sent_at, confirmed_at, unsubscribed_at, created_at, updated_at')
        .eq('email', user.email.toLowerCase())
        .maybeSingle(),
    ])

  assertQuery(profile.error, 'Profil konnte nicht exportiert werden')
  assertQuery(customer.error, 'Kundendaten konnten nicht exportiert werden')
  assertQuery(orders.error, 'Bestellungen konnten nicht exportiert werden')
  assertQuery(wishlist.error, 'Wunschliste konnte nicht exportiert werden')
  assertQuery(addresses.error, 'Adressen konnten nicht exportiert werden')
  assertQuery(contacts.error, 'Kontaktanfragen konnten nicht exportiert werden')
  assertQuery(returns.error, 'Rücksendungen konnten nicht exportiert werden')
  assertQuery(newsletter.error, 'Newsletterstatus konnte nicht exportiert werden')

  const orderIds = (orders.data ?? []).map((order) => order.id)
  const emailLogs = orderIds.length
    ? await shop.from('email_log').select('*').in('order_id', orderIds).order('sent_at')
    : { data: [], error: null }
  assertQuery(emailLogs.error, 'E-Mail-Protokolle konnten nicht exportiert werden')

  const exportData = {
    exported_at: new Date().toISOString(),
    account: {
      id: user.id,
      email: user.email,
      created_at: user.created_at,
      last_sign_in_at: user.last_sign_in_at,
    },
    profile: profile.data,
    customer: customer.data,
    orders: orders.data ?? [],
    wishlist: wishlist.data ?? [],
    addresses: addresses.data ?? [],
    contact_messages: contacts.data ?? [],
    return_requests: returns.data ?? [],
    newsletter: newsletter.data,
    transactional_email_log: emailLogs.data ?? [],
  }

  await removeExistingExports(user.id)

  const path = `exports/${user.id}/${Date.now()}.json`
  const { error: uploadError } = await shop.storage
    .from(EXPORT_BUCKET)
    .upload(path, JSON.stringify(exportData, null, 2), {
      contentType: 'application/json',
      upsert: false,
    })
  if (uploadError) {
    throw new Error(`Exportdatei konnte nicht gespeichert werden: ${uploadError.message}`)
  }

  const { data: signed, error: signError } = await shop.storage
    .from(EXPORT_BUCKET)
    .createSignedUrl(path, EXPORT_URL_TTL_SECONDS)
  if (signError || !signed?.signedUrl) {
    await shop.storage.from(EXPORT_BUCKET).remove([path])
    throw new Error('Export-Link konnte nicht erstellt werden.')
  }

  return {
    downloadUrl: signed.signedUrl,
    expiresInMinutes: EXPORT_URL_TTL_SECONDS / 60,
  }
}
