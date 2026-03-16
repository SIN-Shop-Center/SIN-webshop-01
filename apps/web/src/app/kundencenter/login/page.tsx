import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default function CustomerLoginPage() {
  redirect('/login?next=/kundencenter')
}
