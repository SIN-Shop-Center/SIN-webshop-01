import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

function requiredSupabaseUrl() {
  const value = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
  if (!value) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL (or SUPABASE_URL) is required.')
  }
  return value
}

function requiredSupabaseAnonKey() {
  const value = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY
  if (!value) {
    throw new Error('NEXT_PUBLIC_SUPABASE_ANON_KEY (or SUPABASE_ANON_KEY) is required.')
  }
  return value
}

export function createRouteSupabaseClient() {
  const cookieStore = cookies()
  return createServerClient(requiredSupabaseUrl(), requiredSupabaseAnonKey(), {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value
      },
      set(name: string, value: string, options: any) {
        cookieStore.set({
          name,
          value,
          ...(options || {}),
        })
      },
      remove(name: string, options: any) {
        cookieStore.set({
          name,
          value: '',
          ...(options || {}),
          maxAge: 0,
        })
      },
    },
  })
}
