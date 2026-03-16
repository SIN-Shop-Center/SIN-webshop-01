export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { proxyRequest } from '@/lib/api/proxy'

const RESET_DEFAULT_CONFIG = {
  provider: 'opencode-zen',
  model: 'grok-code',
  personality: 'friendly',
  language: 'de',
  systemPrompt: 'Du bist der freundliche KI-Assistent für den Shop.',
  temperature: 0.7,
  maxTokens: 500,
  welcomeMessage: 'Hallo! Wie kann ich helfen?',
  fallbackMessage: 'Entschuldigung, ich bin gerade nicht erreichbar.',
  enabledFeatures: {
    productRecommendations: true,
    orderTracking: true,
    faq: true,
    humanHandoff: false,
  },
  workingHours: {
    enabled: false,
    start: '09:00',
    end: '18:00',
    timezone: 'Europe/Berlin',
    offlineMessage: 'Unser Chat ist derzeit offline.',
  },
}

export async function GET(request: NextRequest) {
  try {
    return await proxyRequest(request, '/api/v1/admin/ai/config')
  } catch (error) {
    console.error('Admin AI GET proxy failed:', error)
    return NextResponse.json({ error: 'ai_config_proxy_failed' }, { status: 502 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    return await proxyRequest(request, '/api/v1/admin/ai/config')
  } catch (error) {
    console.error('Admin AI PUT proxy failed:', error)
    return NextResponse.json({ error: 'ai_config_proxy_failed' }, { status: 502 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const action = typeof body?.action === 'string' ? body.action : 'test'

    if (action === 'test') {
      return await proxyRequest(request, '/api/v1/admin/ai/test', {
        method: 'POST',
        body: JSON.stringify(body),
      })
    }

    if (action === 'reset') {
      return await proxyRequest(request, '/api/v1/admin/ai/config', {
        method: 'PUT',
        body: JSON.stringify(RESET_DEFAULT_CONFIG),
      })
    }

    return NextResponse.json({ error: 'unknown_action' }, { status: 400 })
  } catch (error) {
    console.error('Admin AI POST proxy failed:', error)
    return NextResponse.json({ error: 'ai_action_proxy_failed' }, { status: 502 })
  }
}
