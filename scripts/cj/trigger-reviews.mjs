// Purpose: Manually trigger the CJ review import cron endpoint
// Usage: SITE_URL=https://shopsin.delqhi.com CRON_SECRET=xxx node scripts/cj/trigger-reviews.mjs

const SITE_URL = process.env.SITE_URL ?? 'https://shopsin.delqhi.com'
const CRON_SECRET = process.env.CRON_SECRET

if (!CRON_SECRET) {
  console.error('CRON_SECRET fehlt. Aufruf: CRON_SECRET=xxx node scripts/cj/trigger-reviews.mjs')
  process.exit(1)
}

const res = await fetch(`${SITE_URL}/api/cron/cj-reviews`, {
  headers: { Authorization: `Bearer ${CRON_SECRET}` },
})

const body = await res.text()
console.log(`Status: ${res.status}`)
console.log(body)

if (!res.ok) process.exit(1)
