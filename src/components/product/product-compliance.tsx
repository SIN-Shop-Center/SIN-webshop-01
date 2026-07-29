import { BadgeCheck, Building2, MapPin } from 'lucide-react'
import type { Product } from '@/lib/data'

export function ProductCompliance({ product }: { product: Product }) {
  if (!product.manufacturer && !product.responsiblePerson) return null

  return (
    <section className="rounded-xl border border-border bg-muted/20 p-4 sm:p-5">
      <div className="flex items-start gap-3">
        <BadgeCheck className="mt-0.5 size-4 shrink-0 text-success" aria-hidden />
        <div>
          <h2 className="text-sm font-semibold">Produktverantwortung</h2>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            Diese Angaben wurden produktbezogen geprüft und nicht pauschal für den gesamten Shop übernommen.
          </p>
        </div>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        {product.manufacturer ? (
          <ContactCard
            icon={Building2}
            title="Hersteller"
            name={product.manufacturer.name}
            company={undefined}
            address={product.manufacturer.address}
            email={product.manufacturer.email}
            phone={product.manufacturer.phone}
          />
        ) : null}
        {product.responsiblePerson ? (
          <ContactCard
            icon={MapPin}
            title="EU-Verantwortlicher"
            name={product.responsiblePerson.name}
            company={product.responsiblePerson.company}
            address={product.responsiblePerson.address}
            email={product.responsiblePerson.email}
            phone={product.responsiblePerson.phone}
          />
        ) : null}
      </div>
    </section>
  )
}

function ContactCard({
  icon: Icon,
  title,
  name,
  company,
  address,
  email,
  phone,
}: {
  icon: typeof Building2
  title: string
  name: string
  company?: string
  address: string
  email: string
  phone?: string
}) {
  return (
    <div className="rounded-lg border border-border bg-background p-4">
      <div className="flex items-center gap-2">
        <Icon className="size-3.5 text-muted-foreground" aria-hidden />
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">{title}</p>
      </div>
      <address className="mt-3 not-italic text-xs leading-5">
        <p className="font-semibold">{name}</p>
        {company ? <p>{company}</p> : null}
        <p className="mt-1 whitespace-pre-line text-muted-foreground">{address}</p>
        <p className="mt-2">
          <a href={`mailto:${email}`} className="hover:underline">{email}</a>
        </p>
        {phone ? (
          <p><a href={`tel:${phone}`} className="hover:underline">{phone}</a></p>
        ) : null}
      </address>
    </div>
  )
}
