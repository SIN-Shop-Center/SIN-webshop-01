import { Clock3, PackageCheck, ShieldCheck, Sparkles } from 'lucide-react'

const VALUE_PROPS = [
  {
    title: 'Nutzen in Sekunden erfassbar',
    description: 'Produkt, Preis, Lieferung und Kaufimpuls werden ohne Umwege lesbar.',
    icon: Sparkles,
  },
  {
    title: 'Lieferung planbar',
    description: 'Verfügbarkeiten und Versandlogik bleiben über den ganzen Funnel sichtbar.',
    icon: Clock3,
  },
  {
    title: 'Vertrauen im Kaufmoment',
    description: 'Rückgabe, Zahlungssicherheit und Kontakt erscheinen genau dort, wo sie gebraucht werden.',
    icon: ShieldCheck,
  },
  {
    title: 'Operative Klarheit',
    description: 'Weniger Dekoration, mehr Orientierung. Jede Fläche hat eine klare Aufgabe.',
    icon: PackageCheck,
  },
]

export function ValuePropsGrid() {
  return (
    <section className="shell-container mt-9">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {VALUE_PROPS.map((item, index) => (
          <article
            key={item.title}
            className="rounded-[1.65rem] border border-brand-border bg-white p-5 shadow-[0_10px_26px_rgba(10,10,10,0.05)] transition-all duration-300 hover:-translate-y-1 hover:border-black/15 hover:shadow-[0_18px_36px_rgba(10,10,10,0.08)]"
          >
            <div className="flex items-center justify-between gap-3">
              <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-brand-border bg-brand-bg">
                <item.icon className="h-5 w-5 text-brand-text" />
              </span>
              <span className="inline-flex h-7 min-w-[1.75rem] items-center justify-center rounded-full border border-brand-border bg-brand-bg px-2 text-[0.68rem] font-bold tracking-[0.08em] text-brand-text-muted">
                {String(index + 1).padStart(2, '0')}
              </span>
            </div>
            <h3 className="mt-4 text-xl font-semibold text-brand-text">{item.title}</h3>
            <p className="mt-2 text-sm leading-7 text-brand-text-muted">{item.description}</p>
          </article>
        ))}
      </div>
    </section>
  )
}
