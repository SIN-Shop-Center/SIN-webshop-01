import type { Metadata } from 'next'
import Link from '@/components/ui/Link'
import { notFound } from 'next/navigation'
import { ArrowUpRight, Bot, Cloud, FileText, GitBranch, Server, ShieldCheck } from 'lucide-react'
import {
  getSinA2AAgent,
  getSinA2ACardUrl,
  getSinA2AGuideUrl,
  getSinA2AMcpUrl,
  getSinA2ATeam,
  listSinA2AAgents,
} from '@/lib/sin-a2a/registry'

export async function generateStaticParams() {
  return listSinA2AAgents().map((agent) => ({ slug: agent.slug }))
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const agent = getSinA2AAgent(params.slug)
  if (!agent) {
    return {
      title: 'A2A Agent nicht gefunden',
    }
  }

  return {
    title: `${agent.name} Guide`,
    description: agent.description,
  }
}

export default function SinA2AAgentPage({ params }: { params: { slug: string } }) {
  const agent = getSinA2AAgent(params.slug)
  if (!agent) {
    notFound()
  }

  const team = getSinA2ATeam(agent.teamId)

  return (
    <div className="shell-container py-10 md:py-14">
      <section className="panel-elevated overflow-hidden px-6 py-8 md:px-10 md:py-12">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="kicker-badge">Guide / Docs</div>
            <p className="mt-5 section-eyebrow">{team?.name || agent.teamId}</p>
            <h1 className="mt-2 text-4xl font-semibold tracking-tight md:text-6xl">{agent.name}</h1>
            <p className="mt-5 max-w-3xl text-base leading-7 text-brand-text-muted md:text-lg">{agent.description}</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <a href={getSinA2AGuideUrl(agent)} className="cta-secondary inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold">
              Public Guide Host
              <ArrowUpRight className="h-4 w-4" />
            </a>
            <a href={getSinA2ACardUrl(agent)} className="cta-primary inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold">
              Agent-Card öffnen
              <ArrowUpRight className="h-4 w-4" />
            </a>
          </div>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <GuideStat icon={ShieldCheck} label="Team" value={team?.name || agent.teamId} />
          <GuideStat icon={GitBranch} label="Repo" value={agent.repo.name} />
          <GuideStat icon={Cloud} label="HF Space" value={`${agent.huggingFaceSpace.owner}/${agent.huggingFaceSpace.slug}`} />
          <GuideStat icon={FileText} label="Docs Tab" value={agent.googleDocs.agentTabId} />
        </div>
      </section>

      <section className="mt-10 grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <div className="space-y-6">
          <article className="panel px-6 py-6">
            <h2 className="text-2xl font-semibold">Öffentliche Endpunkte</h2>
            <div className="mt-5 grid gap-4">
              <GuideLinkCard icon={Bot} label="A2A JSON-RPC" href={`https://${agent.a2a.host}${agent.a2a.jsonRpcPath}`} />
              <GuideLinkCard icon={Bot} label="A2A REST" href={`https://${agent.a2a.host}${agent.a2a.restPath}`} />
              <GuideLinkCard icon={FileText} label="Agent-Card" href={getSinA2ACardUrl(agent)} />
              <GuideLinkCard icon={Server} label="MCP Streamable HTTP" href={getSinA2AMcpUrl(agent)} />
            </div>
          </article>

          <article className="panel px-6 py-6">
            <h2 className="text-2xl font-semibold">Deployment-Spuren</h2>
            <ul className="mt-5 space-y-3 text-sm leading-6 text-brand-text-muted">
              <li>Cloudflare Guide Host: <span className="font-semibold text-brand-text">{agent.cloudflare.directoryHostname}</span></li>
              <li>Cloudflare A2A Host: <span className="font-semibold text-brand-text">{agent.cloudflare.a2aHostname}</span></li>
              <li>Cloudflare MCP Host: <span className="font-semibold text-brand-text">{agent.cloudflare.mcpHostname}</span></li>
              <li>Google Docs Team Tab: <span className="font-semibold text-brand-text">{agent.googleDocs.teamTabId}</span></li>
              <li>Google Docs Agent Tab: <span className="font-semibold text-brand-text">{agent.googleDocs.agentTabId}</span></li>
            </ul>
          </article>
        </div>

        <div className="space-y-6">
          <article className="panel px-6 py-6">
            <h2 className="text-2xl font-semibold">Commands</h2>
            <div className="mt-5 grid gap-3">
              {agent.commands.map((command) => (
                <code key={command} className="rounded-2xl border border-brand-border bg-brand-bg px-4 py-3 text-sm text-brand-text">
                  {command}
                </code>
              ))}
            </div>
          </article>

          <article className="panel px-6 py-6">
            <h2 className="text-2xl font-semibold">Skills, APIs und Pfade</h2>
            <div className="mt-5 grid gap-5 lg:grid-cols-2">
              <div>
                <p className="section-eyebrow">Skills</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {agent.skills.map((skill) => (
                    <span key={skill} className="rounded-full border border-brand-border bg-white px-3 py-1 text-xs font-semibold text-brand-text-muted">
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
              <div>
                <p className="section-eyebrow">API Endpoints</p>
                <ul className="mt-3 space-y-2 text-sm leading-6 text-brand-text-muted">
                  {agent.apiEndpoints.map((endpoint) => (
                    <li key={endpoint}>{endpoint}</li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="mt-6 rounded-3xl border border-brand-border bg-brand-bg px-5 py-5">
              <p className="section-eyebrow">Verzeichnisstruktur</p>
              <ul className="mt-3 space-y-2 text-sm leading-6 text-brand-text-muted">
                <li>{agent.paths.agentRoot}</li>
                <li>{agent.paths.a2aRuntime}</li>
                <li>{agent.paths.mcpRuntime}</li>
                <li>{agent.paths.core}</li>
              </ul>
            </div>
          </article>

          <article className="panel px-6 py-6">
            <h2 className="text-2xl font-semibold">Mehr über das Team</h2>
            <p className="mt-4 text-sm leading-6 text-brand-text-muted">
              Neue SIN-A2A-Agents werden in derselben Registry geführt und automatisch auf der Workforce-Seite, in Cloudflare,
              im Google-Docs-Teambaum und in den Deployment-Scaffolds sichtbar gemacht.
            </p>
            <div className="mt-5">
              <Link href="/a2a" className="cta-secondary inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold">
                Zur Workforce-Übersicht
                <ArrowUpRight className="h-4 w-4" />
              </Link>
            </div>
          </article>
        </div>
      </section>
    </div>
  )
}

function GuideStat({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Bot
  label: string
  value: string
}) {
  return (
    <div className="panel-soft px-4 py-4">
      <div className="flex items-center gap-3">
        <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-brand-accent shadow-sm">
          <Icon className="h-5 w-5" />
        </span>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand-text-muted">{label}</p>
          <p className="mt-1 text-sm font-semibold text-brand-text">{value}</p>
        </div>
      </div>
    </div>
  )
}

function GuideLinkCard({
  icon: Icon,
  label,
  href,
}: {
  icon: typeof Bot
  label: string
  href: string
}) {
  return (
    <a href={href} className="panel-soft flex items-center justify-between gap-3 rounded-2xl px-4 py-4 transition-transform hover:-translate-y-0.5">
      <div className="flex items-center gap-3">
        <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-brand-accent shadow-sm">
          <Icon className="h-5 w-5" />
        </span>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand-text-muted">{label}</p>
          <p className="mt-1 text-sm font-semibold text-brand-text">{href.replace(/^https?:\/\//, '')}</p>
        </div>
      </div>
      <ArrowUpRight className="h-4 w-4 text-brand-text-muted" />
    </a>
  )
}
