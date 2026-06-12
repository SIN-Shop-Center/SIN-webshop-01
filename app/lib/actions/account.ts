// Purpose: Server Actions für Profil-Update + Adressbuch (Issue #55)
'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

const COUNTRY_WHITELIST = ['DE', 'AT', 'CH']

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

  const id = String(formData.get('id') ?? '') || null
  const country = String(formData.get('country') ?? 'DE').toUpperCase()
  if (!COUNTRY_WHITELIST.includes(country)) throw new Error('Land nicht unterstützt')

  const address = {
    user_id: user.id,
    label: String(formData.get('label') ?? 'Zuhause').trim().slice(0, 40),
    full_name: String(formData.get('full_name') ?? '').trim().slice(0, 120),
    street: String(formData.get('street') ?? '').trim().slice(0, 200),
    postal_code: String(formData.get('postal_code') ?? '').trim().slice(0, 10),
    city: String(formData.get('city') ?? '').trim().slice(0, 100),
    country,
    is_default: formData.get('is_default') === 'on',
    updated_at: new Date().toISOString(),
  }
  if (!address.full_name || !address.street || !address.postal_code || !address.city) {
    throw new Error('Bitte alle Pflichtfelder ausfüllen')
  }

  // Vorherige Default-Adresse zurücksetzen (Unique-Partial-Index)
  if (address.is_default) {
    await supabase
      .from('customer_addresses')
      .update({ is_default: false })
      .eq('user_id', user.id)
      .eq('is_default', true)
  }

  const { error } = id
    ? await supabase.from('customer_addresses').update(address).eq('id', id)
    : await supabase.from('customer_addresses').insert(address)
  if (error) throw new Error(error.message)
  revalidatePath('/konto/adressen')
}

export async function deleteAddress(formData: FormData) {
  const supabase = await createClient()
  const id = String(formData.get('id') ?? '')
  if (!id) return
  const { error } = await supabase.from('customer_addresses').delete().eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/konto/adressen')
}
