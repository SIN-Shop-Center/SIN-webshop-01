const isProduction = process.env.NODE_ENV === 'production'
const vercelProduction = process.env.VERCEL_ENV === 'production'

const DEFAULT_IMAGE_HOSTS = ['picsum.photos']

function toOrigin(value) {
  try {
    return new URL(value).origin
  } catch {
    return ''
  }
}

function toHostname(value) {
  try {
    return new URL(value).hostname
  } catch {
    return ''
  }
}

function usesHttpsOrigin(value) {
  try {
    return new URL(value).protocol === 'https:'
  } catch {
    return false
  }
}

const publicSiteUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.SITE_URL || ''
const enforceHttpsSecurityHeaders = isProduction && (vercelProduction || usesHttpsOrigin(publicSiteUrl))

function resolveImageHosts() {
  const configured = process.env.NEXT_PUBLIC_IMAGE_REMOTE_ALLOWLIST || ''
  const hosts = configured
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean)
    .map((value) => value.replace(/^https?:\/\//, '').replace(/\/$/, ''))

  const supabaseHost = toHostname(process.env.SUPABASE_URL || '')
  if (supabaseHost) {
    hosts.push(supabaseHost)
  }

  for (const fallback of DEFAULT_IMAGE_HOSTS) {
    hosts.push(fallback)
  }

  return [...new Set(hosts)]
}

function buildCsp() {
  const connectOrigins = [
    "'self'",
    'https:',
    'wss:',
    toOrigin(process.env.INTERNAL_API_URL || ''),
    toOrigin(process.env.NEXT_PUBLIC_API_URL || ''),
  ].filter(Boolean)

  const scriptSrc = [
    "'self'",
    "'unsafe-inline'",
    'https://js.stripe.com',
    'https://www.paypal.com',
    ...(isProduction ? [] : ["'unsafe-eval'"]),
  ]

  const directives = [
    "default-src 'self'",
    `script-src ${scriptSrc.join(' ')}`,
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "img-src 'self' data: blob: https:",
    "font-src 'self' data: https://fonts.gstatic.com",
    `connect-src ${connectOrigins.join(' ')}`,
    "frame-src 'self' https://js.stripe.com https://hooks.stripe.com https://www.paypal.com",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self' https://checkout.stripe.com https://www.paypal.com",
    'object-src \'none\'',
  ]

  if (enforceHttpsSecurityHeaders) {
    directives.push('upgrade-insecure-requests')
  }

  return directives.join('; ')
}

const securityHeaders = [
  { key: 'Content-Security-Policy', value: buildCsp() },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-DNS-Prefetch-Control', value: 'on' },
  { key: 'Cross-Origin-Opener-Policy', value: 'same-origin-allow-popups' },
  { key: 'Cross-Origin-Resource-Policy', value: 'same-site' },
  { key: 'Permissions-Policy', value: 'camera=(), geolocation=(), microphone=(), payment=(), usb=()' },
]

if (enforceHttpsSecurityHeaders) {
  securityHeaders.push({
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload',
  })
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: resolveImageHosts().map((hostname) => ({
      protocol: 'https',
      hostname,
    })),
  },
  experimental: {
    externalDir: true,
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },
  async headers() {
    const allowlist = process.env.CORS_ALLOWLIST || (isProduction ? '' : 'http://localhost:3000')
    const allowedOrigins = allowlist
      .split(',')
      .map((origin) => origin.trim())
      .filter(Boolean)

    const primaryOrigin = allowedOrigins[0] || ''
    const corsHeaders = [
      { key: 'Access-Control-Allow-Credentials', value: 'true' },
      { key: 'Access-Control-Allow-Methods', value: 'GET,DELETE,OPTIONS,PATCH,POST,PUT' },
      {
        key: 'Access-Control-Allow-Headers',
        value: 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Idempotency-Key, Authorization',
      },
      { key: 'Vary', value: 'Origin' },
    ]
    if (primaryOrigin) {
      corsHeaders.push({ key: 'Access-Control-Allow-Origin', value: primaryOrigin })
    }

    return [
      {
        source: '/(.*)',
        headers: securityHeaders,
      },
      {
        source: '/api/:path*',
        headers: corsHeaders,
      },
    ]
  },
}

module.exports = nextConfig
