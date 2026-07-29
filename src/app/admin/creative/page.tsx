import {
  CheckCircle2,
  Film,
  Image as ImageIcon,
  Layers3,
  MonitorPlay,
  ShieldCheck,
  Sparkles,
} from 'lucide-react'
import { getOperationsOverview } from '@/lib/actions/operations/overview'
import { QueueOperationButton } from '../components/QueueOperationButton'

export const dynamic = 'force-dynamic'

const DELIVERABLES = [
  {
    title: 'Produktbild-Paket',
    description: 'Hero, Detail, Anwendung, Größenvergleich und kanaloptimierte Varianten.',
    icon: ImageIcon,
  },
  {
    title: 'UGC Creative Pack',
    description: 'Hook, Problem, Demo, Social Proof und CTA als mehrere testbare Varianten.',
    icon: Sparkles,
  },
  {
    title: 'OpenMontage Video',
    description: '9:16-Master, Untertitel, Voice, Thumbnail und veröffentlichungsfertiger Export.',
    icon: MonitorPlay,
  },
] as const

export default async function CreativeStudioPage() {
  const overview = await getOperationsOverview()
  const creative = overview.stages.find((stage) => stage.id === 'creative.generate')
  const social = overview.stages.find((stage) => stage.id === 'social.prepare')

  return (
    <div className="space-y-8">
      <header className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
        <div className="max-w-3xl">
          <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            <Film className="size-3.5" aria-hidden />
            Creative Runtime
          </div>
          <h1 className="text-3xl font-semibold tracking-[-0.035em]">Creative Studio</h1>
          <p className="mt-3 text-sm leading-6 text-muted-foreground sm:text-base">
            Aus freigegebenen Produktdaten entstehen konsistente Produktbilder, UGC-Pakete
            und lokale OpenMontage-Videojobs. Jeder Export bleibt bis zur Qualitätsprüfung gesperrt.
          </p>
        </div>
        <QueueOperationButton operation="creative.generate" label="Creative-Pack einplanen" />
      </header>

      <section className="grid gap-4 lg:grid-cols-3">
        {DELIVERABLES.map(({ title, description, icon: Icon }, index) => (
          <article key={title} className="rounded-2xl border border-border bg-card p-6">
            <div className="flex items-center justify-between">
              <div className="grid size-10 place-items-center rounded-xl border border-border bg-muted/40">
                <Icon className="size-4.5" strokeWidth={1.8} aria-hidden />
              </div>
              <span className="text-xs font-medium text-muted-foreground">0{index + 1}</span>
            </div>
            <h2 className="mt-6 font-semibold tracking-tight">{title}</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">{description}</p>
          </article>
        ))}
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <article className="rounded-2xl border border-border bg-card">
          <div className="border-b border-border px-5 py-5 sm:px-6">
            <div className="flex items-center gap-3">
              <div className="grid size-9 place-items-center rounded-lg bg-foreground text-background">
                <Layers3 className="size-4" aria-hidden />
              </div>
              <div>
                <h2 className="font-semibold tracking-tight">Produkt → Creative Pipeline</h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  Standardisierte Übergabe statt manuellem Copy-Paste zwischen Systemen.
                </p>
              </div>
            </div>
          </div>
          <ol className="divide-y divide-border">
            {[
              ['Datenprüfung', 'Titel, Fakten, Varianten, Bildrechte und Compliance müssen vollständig sein.'],
              ['Creative Brief', 'Zielgruppe, Nutzenversprechen, Hooks, Belege und verbotene Claims werden fixiert.'],
              ['Asset Generation', 'Bildvarianten und UGC-Szenen werden mit reproduzierbaren Prompts erzeugt.'],
              ['OpenMontage', 'Das lokale System rendert Video, Untertitel, Audio, Thumbnail und QA-Bericht.'],
              ['Freigabe', 'Nur geprüfte Assets gelangen in Shop-, TikTok- oder Social-Queues.'],
            ].map(([title, text], index) => (
              <li key={title} className="flex gap-4 px-5 py-5 sm:px-6">
                <span className="grid size-7 shrink-0 place-items-center rounded-full border border-border text-xs font-semibold tabular-nums">
                  {index + 1}
                </span>
                <div>
                  <p className="text-sm font-semibold">{title}</p>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">{text}</p>
                </div>
              </li>
            ))}
          </ol>
        </article>

        <div className="space-y-6">
          <article className="rounded-2xl border border-border bg-card p-6">
            <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
              Queue Status
            </p>
            <div className="mt-5 grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-border bg-muted/30 p-4">
                <p className="text-3xl font-semibold tabular-nums">{creative?.count ?? 0}</p>
                <p className="mt-1 text-xs text-muted-foreground">Creative Jobs</p>
              </div>
              <div className="rounded-xl border border-border bg-muted/30 p-4">
                <p className="text-3xl font-semibold tabular-nums">{social?.count ?? 0}</p>
                <p className="mt-1 text-xs text-muted-foreground">Social Entwürfe</p>
              </div>
            </div>
          </article>

          <article className="rounded-2xl border border-success/20 bg-success/5 p-6">
            <div className="flex items-start gap-3">
              <ShieldCheck className="mt-0.5 size-5 shrink-0 text-success" aria-hidden />
              <div>
                <h2 className="text-sm font-semibold">Sicherer Veröffentlichungsmodus</h2>
                <p className="mt-2 text-xs leading-5 text-muted-foreground">
                  Direkte Nachrichten, Community-Posts und Interaktionen werden nur als Entwurf
                  vorbereitet. Freigabe, Rate-Limits, Opt-out und Plattformregeln bleiben zwingend.
                </p>
              </div>
            </div>
          </article>

          <article className="rounded-2xl border border-border bg-card p-6">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-muted-foreground" aria-hidden />
              <div>
                <h2 className="text-sm font-semibold">Lokale OpenMontage-Anbindung</h2>
                <p className="mt-2 text-xs leading-5 text-muted-foreground">
                  Der Worker erzeugt einen reproduzierbaren Projektauftrag im lokalen OpenMontage-Repo.
                  Fehlende Provider oder Render-Runtimes werden als Blocker protokolliert, nicht kaschiert.
                </p>
              </div>
            </div>
          </article>
        </div>
      </section>
    </div>
  )
}
