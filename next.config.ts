import type { NextConfig } from 'next'

// CSP: bewusst ohne `require-trusted-types-for` und ohne COEP
// (COEP bricht Stripe-iframes). Erst aktivieren wenn SharedArrayBuffer
// oder Cross-Origin-Isolation gebraucht wird.
const csp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' https://js.stripe.com",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://cf.cjdropshipping.com https://*.cjdropshipping.com https://cbu01.alicdn.com https://images.unsplash.com https://lh3.googleusercontent.com https://supabase.delqhi.com",
  "font-src 'self' data:",
  "connect-src 'self' https://api.stripe.com https://api.delqhi.com https://supabase.delqhi.com wss:",
  "frame-src https://js.stripe.com https://hooks.stripe.com",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self' https://hooks.stripe.com",
  "frame-ancestors 'none'",
  'upgrade-insecure-requests',
].join('; ')

// Phase 1 (7 Tage Report-Only): CSP_ENFORCE !== 'true' → Report-Only
// Phase 2: Nach 7 Tagen ohne Violations → CSP_ENFORCE=true als Env-Var setzen
const cspHeader = process.env.CSP_ENFORCE === 'true'
  ? { key: 'Content-Security-Policy', value: csp }
  : { key: 'Content-Security-Policy-Report-Only', value: csp }

const securityHeaders = [
  cspHeader,
  { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains; preload' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()' },
  { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
  { key: 'Cross-Origin-Resource-Policy', value: 'same-site' },
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
      { protocol: 'https', hostname: 'supabase.delqhi.com' },
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' },
    ],
  },
  async headers() {
    return [
      { source: '/(.*)', headers: securityHeaders },
    ]
  },
  // NEU: Englische/falsche URLs auf deutsche Routen umleiten (kein 404 mehr)
  async redirects() {
    return [
      { source: '/products', destination: '/produkte', permanent: true },
      { source: '/product/:id', destination: '/produkt/:id', permanent: true },
      { source: '/cart', destination: '/warenkorb', permanent: true },
      { source: '/search', destination: '/suche', permanent: true },
      { source: '/contact', destination: '/kontakt', permanent: true },
      { source: '/wishlist', destination: '/wunschliste', permanent: true },
      // Alte Hilfe-Kontaktseite auf das echte Kontaktformular
      { source: '/hilfe/kontakt', destination: '/kontakt', permanent: false },
    ]
  },
}

export default nextConfig
