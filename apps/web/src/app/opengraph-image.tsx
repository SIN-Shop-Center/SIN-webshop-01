import { ImageResponse } from 'next/og'

export const contentType = 'image/png'
export const size = {
  width: 1200,
  height: 630,
}

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          display: 'flex',
          width: '100%',
          height: '100%',
          background: 'linear-gradient(135deg, #f4f1eb 0%, #fbfaf7 55%, #ece7de 100%)',
          color: '#121212',
          padding: '64px',
          fontFamily: 'sans-serif',
        }}
      >
        <div
          style={{
            display: 'flex',
            width: '100%',
            border: '1px solid rgba(18,18,18,0.08)',
            borderRadius: '40px',
            padding: '56px',
            background: 'rgba(255,255,255,0.72)',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', width: '100%' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '12px 18px',
                  borderRadius: '999px',
                  border: '1px solid rgba(18,18,18,0.1)',
                  fontSize: '22px',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.14em',
                }}
              >
                Simone Shop
              </div>
              <div style={{ fontSize: '72px', lineHeight: 1.04, fontWeight: 800, maxWidth: '760px' }}>
                Produkte schneller verstehen. Sicherer entscheiden.
              </div>
              <div style={{ fontSize: '30px', lineHeight: 1.45, maxWidth: '720px', color: '#4f4a42' }}>
                Preis, Lieferung und Rückgabe bleiben vom ersten Klick bis zur Bestellung sichtbar.
              </div>
            </div>

            <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
              {['Transparente Preise', '30 Tage Rückgabe', 'Kontakt in 24 Stunden'].map((item) => (
                <div
                  key={item}
                  style={{
                    display: 'flex',
                    padding: '14px 20px',
                    borderRadius: '999px',
                    border: '1px solid rgba(18,18,18,0.1)',
                    background: '#ffffff',
                    fontSize: '22px',
                    fontWeight: 600,
                  }}
                >
                  {item}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    ),
    size,
  )
}
