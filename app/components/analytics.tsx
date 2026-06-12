// Purpose: Plausible Analytics — cookielos, DSGVO-konform, kein Consent-Banner nötig (Issue #58)

import Script from 'next/script'

const PLAUSIBLE_DOMAIN = process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN // z.B. shopsin.delqhi.com
const PLAUSIBLE_HOST = process.env.NEXT_PUBLIC_PLAUSIBLE_HOST // z.B. https://plausible.delqhi.com

export function Analytics() {
  if (!PLAUSIBLE_DOMAIN || !PLAUSIBLE_HOST) return null
  return (
    <Script
      defer
      data-domain={PLAUSIBLE_DOMAIN}
      src={`${PLAUSIBLE_HOST}/js/script.outbound-links.js`}
      strategy="afterInteractive"
    />
  )
}
