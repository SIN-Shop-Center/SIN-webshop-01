import Link from '@/components/ui/Link'
import type { Metadata } from 'next'
import { ArrowUpRight, Bot, Cloud, FileText, Server, ShieldCheck } from 'lucide-react'
import { getSinA2ACardUrl, getSinA2AGuideUrl, getSinA2AMcpUrl, getSinA2ATeam, listSinA2AAgents } from '@/lib/sin-a2a/registry'

export const metadata: Metadata = {
  title: 'SIN Silicon Workforce',
  description: 'Alle öffentlichen SIN A2A Agents, Guides, Agent-Cards und MCP-Endpunkte an einem Ort.',
}

export default function SinA2AIndexPage() {
  const agents = listSinA2AAgents()

  return (
    <main className="shell-container py-10 md:py-14">
      <section className="panel-elevated hero-grid-overlay overflow-hidden px-6 py-8 md:px-10 md:py-12">
        <div className="kicker-badge">SIN Silicon Workforce</div>
        <div className="mt-6 grid gap-8 lg:grid-cols-[1.25fr_0.95fr]">
          <div>
            <h1 className="max-w-4xl text-4xl font-semibold tracking-tight md:text-6xl">
              Öffentliche Agent-Cards, Guides und operative Endpunkte für jedes SIN-A2A-Team.
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-brand-text-muted md:text-lg">
              Jeder gelistete Agent bekommt eine eigene Guide-Page, einen A2A-Endpoint, einen MCP-Endpoint, eine eigene
              Google-Docs-Tab-Zuordnung und eine vorbereitete Deployment-Spur für Cloudflare und Hugging Face.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <span className="trust-chip px-4 py-2">A2A-first</span>
              <span className="trust-chip px-4 py-2">MCP + Skills + Commands</span>
              <span className="trust-chip px-4 py-2">Cloudflare Guide Hosts</span>
              <span className="trust-chip px-4 py-2">Google-Docs-Sync</span>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <MetricCard icon={Bot} label="Aktive Agents" value={String(agents.length)} detail="Öffentlich gelistete SIN-A2A-Agents" />
            <MetricCard icon={ShieldCheck} label="A2A Cards" value="100%" detail="Jeder Agent mit eigener Agent-Card" />
            <MetricCard icon={Server} label="MCP Server" value="Remote" detail="Streamable HTTP oder stdio je Agent" />
            <MetricCard icon={Cloud} label="Deploy Targets" value="CF + HF" detail="Guide-Host, Tunnel und Space-Scaffold" />
          </div>
        </div>
      </section>

      <section className="mt-10">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="section-eyebrow">Agent Directory</p>
            <h2 className="mt-2 text-3xl font-semibold">Alle gelisteten SIN-A2A-Agents</h2>
          </div>
          <Link href="/api/a2a/agents" className="cta-secondary inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold">
            JSON Registry
            <ArrowUpRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="mt-6 grid gap-5 lg:grid-cols-2">
          {agents.map((agent) => {
            const team = getSinA2ATeam(agent.teamId)
            return (
              <article key={agent.id} className="panel overflow-hidden">
                <div className="border-b border-brand-border bg-white/80 px-6 py-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="section-eyebrow">{team?.name || agent.teamId}</p>
                      <h3 className="mt-2 text-2xl font-semibold">{agent.name}</h3>
                      <p className="mt-3 max-w-2xl text-sm leading-6 text-brand-text-muted">{agent.description}</p>
                    </div>
                    <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-emerald-700">
                      {agent.status}
                    </span>
                  </div>
                </div>
                <div className="grid gap-4 px-6 py-5 md:grid-cols-3">
                  <EndpointCard label="Guide" href={getSinA2AGuideUrl(agent)} value={agent.guide.host} icon={FileText} />
                  <EndpointCard label="A2A" href={getSinA2ACardUrl(agent)} value={agent.a2a.host} icon={Bot} />
                  <EndpointCard label="MCP" href={getSinA2AMcpUrl(agent)} value={agent.mcp.host} icon={Server} />
                </div>
                <div className="border-t border-brand-border px-6 py-5">
                  <div className="flex flex-wrap gap-2">
                    {agent.skills.map((skill) => (
                      <span key={skill} className="rounded-full border border-brand-border bg-brand-bg px-3 py-1 text-xs font-semibold text-brand-text-muted">
                        {skill}
                      </span>
                    ))}
                  </div>
                  <div className="mt-5 flex flex-wrap gap-3">
                    <Link href={agent.guide.route} className="cta-primary inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold">
                      Guide öffnen
                      <ArrowUpRight className="h-4 w-4" />
                    </Link>
                    <a href={getSinA2ACardUrl(agent)} className="cta-secondary inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold">
                      Agent-Card
                      <ArrowUpRight className="h-4 w-4" />
                    </a>
                  </div>
                </div>
              </article>
            )
          })}
        </div>
      </section>
    </main>
  )
}

function MetricCard({
  icon: Icon,
  label,
  value,
  detail,
}: {
  icon: typeof Bot
  label: string
  value: string
  detail: string
}) {
  return (
    <div className="panel-soft px-4 py-4">
      <div className="flex items-center gap-3">
        <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-brand-accent shadow-sm">
          <Icon className="h-5 w-5" />
        </span>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand-text-muted">{label}</p>
          <p className="mt-1 text-2xl font-semibold">{value}</p>
        </div>
      </div>
      <p className="mt-3 text-sm leading-6 text-brand-text-muted">{detail}</p>
    </div>
  )
}

function EndpointCard({
  label,
  href,
  value,
  icon: Icon,
}: {
  label: string
  href: string
  value: string
  icon: typeof Bot
}) {
  return (
    <a href={href} className="panel-soft block rounded-2xl px-4 py-4 transition-transform hover:-translate-y-0.5">
      <div className="flex items-center justify-between gap-3">
        <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-brand-accent shadow-sm">
          <Icon className="h-5 w-5" />
        </span>
        <ArrowUpRight className="h-4 w-4 text-brand-text-muted" />
      </div>
      <p className="mt-4 text-xs font-semibold uppercase tracking-[0.14em] text-brand-text-muted">{label}</p>
      <p className="mt-1 text-sm font-semibold text-brand-text">{value}</p>
    </a>
  )
}
