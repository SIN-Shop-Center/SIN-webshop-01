import registryData from '../../../../../config/sin-a2a/registry.json'

export type SinA2ARegistry = typeof registryData
export type SinA2ATeam = SinA2ARegistry['teams'][number]
export type SinA2AAgent = SinA2ARegistry['agents'][number]

const registry = registryData satisfies SinA2ARegistry

function normalizeHostname(value: string): string {
  return String(value || '').trim().toLowerCase().replace(/:\d+$/, '')
}

export function getSinA2AWorkspace() {
  return registry.workspace
}

export function listSinA2ATeams() {
  return registry.teams
}

export function listSinA2AAgents() {
  return registry.agents
}

export function getSinA2ATeam(teamId: string) {
  return registry.teams.find((team) => team.id === teamId) || null
}

export function getSinA2AAgent(slug: string) {
  return registry.agents.find((agent) => agent.slug === slug) || null
}

export function findSinA2AAgentByGuideHost(hostname: string) {
  const normalized = normalizeHostname(hostname)
  return registry.agents.find((agent) => normalizeHostname(agent.guide.host) === normalized) || null
}

export function isSinA2AIndexHost(hostname: string) {
  return normalizeHostname(registry.workspace.indexHost) === normalizeHostname(hostname)
}

export function getSinA2AGuideUrl(agent: SinA2AAgent) {
  const route = String(agent.guide.route || '').trim()
  return `https://${agent.guide.host}${route && route !== '/' ? route : ''}`
}

export function getSinA2ACardUrl(agent: SinA2AAgent) {
  return `https://${agent.a2a.host}${agent.a2a.cardPath}`
}

export function getSinA2AMcpUrl(agent: SinA2AAgent) {
  return `https://${agent.mcp.host}${agent.mcp.path}`
}

export function getSinA2ATeamAgents(teamId: string) {
  return registry.agents.filter((agent) => agent.teamId === teamId)
}
