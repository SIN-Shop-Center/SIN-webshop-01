// Purpose: Authentication boundary and no-index metadata for /konto/*.

import type { Metadata } from 'next'
import { redirect } from 'next/navigation'

import { createClient } from '@/lib/supabase/server'

export const metadata: Metadata = {
  title: 'Mein Konto',
  robots: { index: false, follow: false },
}

export default async function AccountLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/auth/login?next=/konto')
  return <>{children}</>
}
