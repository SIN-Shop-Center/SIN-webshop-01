// Purpose: DSGVO Art. 17 (Recht auf Löschung) + Art. 20 (Datenübertragbarkeit)
// Docs: Issue #43
//
// deleteMyAccount: anonymisiert Orders (Beträge bleiben — Steuer-Pflicht 10 Jahre),
// löscht PII (auth.users, profile, cart, wishlist), leitet auf Startseite.
// exportMyData: generiert JSON mit allen User-Daten, signed-URL in Supabase Storage.

'use server'

import { createAdminClient } from '@/app/lib/supabase/admin'
import { createClient } from '@/app/lib/supabase/server'
import { redirect } from 'next/navigation'

const CONFIRMATION_TEXT = 'LÖSCHEN'

export async function deleteMyAccount(confirmation: string) {
  if (confirmation !== CONFIRMATION_TEXT) {
    throw new Error(`Bestätigung fehlt — tippe "${CONFIRMATION_TEXT}".`)
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Nicht eingeloggt.')

  const admin = createAdminClient()

  // 1. Orders anonymisieren (Beträge bleiben — Steuer-Pflicht 10 Jahre)
  await admin
    .from('orders')
    .update({
      email: `redacted-${user.id}@deleted.invalid`,
      shipping_address: null,
      customer_name: 'Gelöscht',
      user_id: null,
    })
    .eq('user_id', user.id)

  // 2. Personenbezogene Daten hart löschen
  await admin.from('wishlist_items').delete().eq('user_id', user.id)
  await admin.from('cart_items').delete().eq('user_id', user.id)
  await admin.from('profiles').delete().eq('id', user.id)

  // 3. Auth-User löschen + Logout
  const { error: authError } = await admin.auth.admin.deleteUser(user.id)
  if (authError) throw authError
  await supabase.auth.signOut()

  redirect('/')
}

export async function exportMyData() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Nicht eingeloggt.')

  const admin = createAdminClient()
  const [profile, orders, wishlist, contact] = await Promise.all([
    admin.from('profiles').select('*').eq('id', user.id).maybeSingle(),
    admin.from('orders').select('*').eq('user_id', user.id),
    admin.from('wishlist_items').select('*').eq('user_id', user.id),
    admin.from('contact_messages').select('*').eq('user_id', user.id),
  ])

  const exportData = {
    exported_at: new Date().toISOString(),
    account: {
      id: user.id,
      email: user.email,
      created_at: user.created_at,
    },
    profile: profile.data,
    orders: orders.data ?? [],
    wishlist: wishlist.data ?? [],
    contact_messages: contact.data ?? [],
  }

  const path = `exports/${user.id}/${Date.now()}.json`
  await admin.storage
    .from('data-exports')
    .upload(path, JSON.stringify(exportData, null, 2), {
      contentType: 'application/json',
      upsert: false,
    })

  const { data: signed, error: signError } = await admin.storage
    .from('data-exports')
    .createSignedUrl(path, 7 * 24 * 3600)

  if (signError || !signed) {
    throw new Error('Export-URL konnte nicht erstellt werden.')
  }

  return { downloadUrl: signed.signedUrl, expiresInDays: 7 }
}
