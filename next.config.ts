import type { NextConfig } from 'next'

// CSP: bewusst ohne `require-trusted-types-for` und ohne COEP
// (COEP bricht Stripe-iframes). Erst aktivieren wenn SharedArrayBuffer
// oder Cross-Origin-Isolation gebraucht wird.
const csp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' https://js.stripe.com",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://cf.cjdropshipping.com https://*.cjdropshipping.com https://cbu01.alicdn.com https://images.unsplash.com https://lh3.googleusercontent.com",
  "font-src 'self' data:",
  "connect-src 'self' https://api.stripe.com https://api.delqhi.com https://supabase.delqhi.com wss:",
  "frame-src https://js.stripe.com https://hooks.stripe.com",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self' https://hooks.stripe.com",
  "frame-ancestors 'none'",
  'upgrade-insecure-requests',
].join('; ')

const securityHeaders = [
  { key: 'Content-Security-Policy', value: csp },
  { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains; preload' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()' },
  { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
  { key: 'Cross-Origin-Resource-Policy', value: 'same-origin' },
]

const nextConfig: NextConfig = {
  images: {
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 60 * 60 * 24 * 30,
    remotePatterns: [
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: 'cf.cjdropshipping.com' },
      { protocol: 'https', hostname: '**.cjdropshipping.com' },
      { protocol: 'https', hostname: 'cbu01.alicdn.com' },
    ],
  },
  async headers() {
    return [
      { source: '/(.*)', headers: securityHeaders },
    ]
  },
}

export default nextConfig
