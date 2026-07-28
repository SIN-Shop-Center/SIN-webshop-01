// Purpose: Server Actions für Profil-Update + Adressbuch (Issue #55)
'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export async function updateProfile(formData: FormData) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Nicht angemeldet')

  const fullName = String(formData.get('full_name') ?? '').trim().slice(0, 120)
  if (!fullName) throw new Error('Name darf nicht leer sein')

  const { error } = await supabase.auth.updateUser({
    data: { full_name: fullName },
  })
  if (error) throw new Error(error.message)
  revalidatePath('/konto')
}

export async function updateEmail(formData: FormData) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Nicht angemeldet')

  const email = String(formData.get('email') ?? '').trim().toLowerCase()
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error('Ungültige E-Mail-Adresse')
  }

  // Supabase sendet Bestätigungs-Mail an alte UND neue Adresse (secure email change)
  const { error } = await supabase.auth.updateUser({ email })
  if (error) throw new Error(error.message)
  return { ok: true, message: 'Bestätigungs-E-Mail versendet' }
}

export async function listAddresses() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return []

  const { data, error } = await supabase
    .from('customer_addresses')
    .select('*')
    .eq('user_id', user.id)
    .order('is_default', { ascending: false })
    .order('created_at', { ascending: true })
  if (error) throw new Error(error.message)
  return data ?? []
}

export async function saveAddress(formData: FormData) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Nicht angemeldet')

  const rawId = String(formData.get('id') ?? '').trim()
  const id = rawId ? rawId : null
  if (id && !UUID_RE.test(id)) throw new Error('Ungültige Adress-ID')

  const country = String(formData.get('country') ?? 'DE').toUpperCase()
  if (country !== 'DE') throw new Error('Der Versand ist derzeit nur innerhalb Deutschlands möglich.')

  const { error } = await supabase.rpc('save_customer_address', {
    p_id: id!,
    p_label: String(formData.get('label') ?? 'Zuhause').trim(),
    p_full_name: String(formData.get('full_name') ?? '').trim(),
    p_street: String(formData.get('street') ?? '').trim(),
    p_postal_code: String(formData.get('postal_code') ?? '').trim(),
    p_city: String(formData.get('city') ?? '').trim(),
    p_country: country,
    p_is_default: formData.get('is_default') === 'on',
  })
  if (error) throw new Error(error.message)
  revalidatePath('/konto/adressen')
}

export async function deleteAddress(formData: FormData) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Nicht angemeldet')

  const id = String(formData.get('id') ?? '').trim()
  if (!UUID_RE.test(id)) throw new Error('Ungültige Adress-ID')
  const { error } = await supabase
    .from('customer_addresses')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)
  if (error) throw new Error(error.message)
  revalidatePath('/konto/adressen')
}
