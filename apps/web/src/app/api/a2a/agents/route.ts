import { NextResponse } from 'next/server'
import { getSinA2AWorkspace, listSinA2AAgents, listSinA2ATeams } from '@/lib/sin-a2a/registry'

export async function GET() {
  return NextResponse.json(
    {
      workspace: getSinA2AWorkspace(),
      teams: listSinA2ATeams(),
      agents: listSinA2AAgents(),
    },
    {
      headers: {
        'cache-control': 'public, s-maxage=300, stale-while-revalidate=3600',
      },
    },
  )
}
