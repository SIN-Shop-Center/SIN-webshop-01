import type WebSocket from 'ws'
import { connectWebSocket, parseCDPMessage } from './auto-healing-cdp-helpers'
import type { AutoHealingCDP } from './auto-healing-cdp'

export async function connectBrowser(ctx: AutoHealingCDP): Promise<void> {
  ctx.browserSocket = await connectWebSocket(
    ctx.config.browserWSEndpoint,
    ctx.config.connectionTimeout,
    (data) => handleBrowserMessage(ctx, data),
    () => void ctx.handleDisconnect(),
  )
}

export async function attachToTarget(ctx: AutoHealingCDP): Promise<void> {
  const targets = await ctx.getTargets()
  const pageTarget = targets.find((target) => target.type === 'page')
  ctx.currentTargetId = pageTarget ? pageTarget.targetId : await ctx.createTarget('about:blank')

  await ctx.send('Target.attachToTarget', {
    targetId: ctx.currentTargetId,
    flatten: true,
  })

  const targetWsURL = `${ctx.config.browserWSEndpoint}/devtools/page/${ctx.currentTargetId}`
  ctx.targetSocket = await connectWebSocket(
    targetWsURL,
    ctx.config.connectionTimeout,
    (data) => handleTargetMessage(ctx, data),
    () => void ctx.handleDisconnect(),
  )
}

export function handleBrowserMessage(ctx: AutoHealingCDP, data: WebSocket.Data): void {
  const message = parseCDPMessage(data)
  if (message?.method) {
    ctx.emit(message.method, message.params)
  }
}

export function handleTargetMessage(ctx: AutoHealingCDP, data: WebSocket.Data): void {
  const message = parseCDPMessage(data)
  if (!message) {
    return
  }

  if (message.id !== undefined && ctx.pendingMessages.has(message.id)) {
    const pending = ctx.pendingMessages.get(message.id)
    ctx.pendingMessages.delete(message.id)
    if (pending) {
      if (message.error) {
        pending.reject(new Error(message.error.message))
      } else {
        pending.resolve(message.result)
      }
    }
  }

  if (message.method) {
    ctx.emit(message.method, message.params)
  }
}
