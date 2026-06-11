// Purpose: OpenGraph 1200x630 social card (Step 10 — social share)
// Docs: PLAN-VERKAUFSFAEHIG.md

import { ImageResponse } from 'next/og'

export const alt = 'ShopSIN — Premium Tech & Lifestyle'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          background: '#0a0a0a',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#ffffff',
          padding: 80,
          fontFamily: 'sans-serif',
        }}
      >
        <div
          style={{
            fontSize: 96,
            fontWeight: 800,
            letterSpacing: -2,
            marginBottom: 24,
          }}
        >
          ShopSIN
        </div>
        <div
          style={{
            fontSize: 36,
            color: '#d4d4d4',
            marginBottom: 56,
          }}
        >
          Premium Tech &amp; Lifestyle
        </div>
        <div
          style={{
            background: '#d97706',
            color: '#ffffff',
            padding: '16px 32px',
            borderRadius: 9999,
            fontSize: 28,
            fontWeight: 600,
          }}
        >
          Kostenloser Versand ab 49 €
        </div>
      </div>
    ),
    { ...size },
  )
}
