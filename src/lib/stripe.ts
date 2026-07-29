// Purpose: Stripe client (server-only, Step 4 of migration)
// Docs: PLAN-VERKAUFSFAEHIG.md (issues #20-#26)
//
// Note: Lazy initialization to avoid build-time errors when STRIPE_SECRET_KEY
// is not set (e.g. in CI without secrets).

import 'server-only'

import Stripe from 'stripe'

let _stripe: Stripe | null = null

export function getStripe(): Stripe {
  if (!_stripe) {
    const key = process.env.STRIPE_SECRET_KEY
    if (!key) throw new Error('STRIPE_SECRET_KEY is not set')
    _stripe = new Stripe(key)
  }
  return _stripe
}
