// Legacy route kept only for old Stripe sessions and bookmarks.

import { redirect } from 'next/navigation'

export const metadata = {
  title: 'Bestellung prüfen — ShopSIN',
  robots: { index: false, follow: false },
}

export default async function LegacyCheckoutSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ session_id?: string }>
}) {
  const { session_id: sessionId } = await searchParams
  const query = sessionId ? `?session_id=${encodeURIComponent(sessionId)}` : ''
  redirect(`/kasse/erfolg${query}`)
}
