function addressText(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

function ShippingAddress({ address }: { address: Record<string, unknown> }) {
  const lines = [
    addressText(address.name),
    addressText(address.line1),
    addressText(address.line2),
    [addressText(address.postal_code), addressText(address.city)].filter(Boolean).join(' '),
    addressText(address.country),
  ].filter(Boolean)
  if (!lines.length) return null
  return <address className="not-italic text-sm leading-relaxed text-muted-foreground">{lines.map((line) => <span key={line}>{line}<br /></span>)}</address>
}

export function OrderShipping({ trackingNumber, address }: {
  trackingNumber: string | null
  address: Record<string, unknown> | null
}) {
  if (!trackingNumber && !address) return null
  return (
    <section className="mb-6 grid gap-4 sm:grid-cols-2">
      {trackingNumber ? <div className="rounded-lg border border-border p-4"><h2 className="mb-2 text-sm font-medium">Sendungsverfolgung</h2>
        <a href={`https://t.17track.net/de#nums=${encodeURIComponent(trackingNumber)}`} target="_blank" rel="noopener noreferrer" className="text-sm text-primary underline">{trackingNumber}</a>
      </div> : null}
      {address ? <div className="rounded-lg border border-border p-4"><h2 className="mb-2 text-sm font-medium">Lieferadresse</h2><ShippingAddress address={address} /></div> : null}
    </section>
  )
}
