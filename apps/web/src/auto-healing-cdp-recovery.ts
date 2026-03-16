import WebSocket from 'ws'
import { computeReconnectDelay } from './auto-healing-cdp-helpers'
import { ConnectionState, type AutoHealingCDP } from './auto-healing-cdp'

export async function handleDisconnect(ctx: AutoHealingCDP): Promise<void> {
  if (ctx.state === ConnectionState.DISCONNECTED || ctx.state === ConnectionState.RECONNECTING) {
    return
  }

  if (ctx.sessionPersistence && ctx.isConnected()) {
    try {
      await ctx.sessionPersistence.saveSession()
      ctx.emit('sessionSaved')
    } catch (error) {
      console.warn('[AutoHealingCDP] Failed to save session on disconnect:', error)
    }
  }

  setState(ctx, ConnectionState.DISCONNECTED)
  ctx.emit('disconnected')
  await scheduleReconnect(ctx)
}

export async function scheduleReconnect(ctx: AutoHealingCDP): Promise<void> {
  if (ctx.reconnectAttempts >= ctx.config.maxReconnectAttempts) {
    setState(ctx, ConnectionState.ERROR)
    ctx.emit('reconnectFailed')
    return
  }

  ctx.reconnectAttempts += 1
  setState(ctx, ConnectionState.RECONNECTING)
  const delay = computeReconnectDelay(ctx.config.reconnectDelay, ctx.config.maxReconnectDelay, ctx.reconnectAttempts)
  console.log(`[AutoHealingCDP] Reconnecting in ${delay}ms (attempt ${ctx.reconnectAttempts}/${ctx.config.maxReconnectAttempts})`)

  clearReconnectTimer(ctx)
  ctx.reconnectTimer = setTimeout(() => {
    void ctx.connect().catch((error) => {
      console.error('[AutoHealingCDP] Reconnection failed:', error)
    })
  }, delay)
}

export async function restoreSession(ctx: AutoHealingCDP): Promise<void> {
  if (!ctx.sessionPersistence) {
    return
  }

  try {
    await ctx.sessionPersistence.initialize()
    const sessions = await ctx.sessionPersistence.listSessions()
    if (sessions.length === 0) {
      return
    }

    const lastSession = sessions[0]
    if (!(await ctx.sessionPersistence.sessionExists(lastSession.sessionId))) {
      return
    }

    console.log(`[AutoHealingCDP] Restoring session: ${lastSession.sessionId}`)
    ctx.sessionPersistence.setCDPClient({
      send: ctx.send.bind(ctx),
      on: ctx.on.bind(ctx),
      removeListener: ctx.removeListener.bind(ctx),
    })

    await ctx.sessionPersistence.restoreSession(lastSession.sessionId)
    ctx.emit('sessionRestored', lastSession)
  } catch (error) {
    console.warn('[AutoHealingCDP] Failed to restore session:', error)
  }
}

export async function processMessageQueue(ctx: AutoHealingCDP): Promise<void> {
  while (ctx.messageQueue.length > 0 && ctx.isConnected()) {
    const message = ctx.messageQueue.shift()
    if (!message) {
      continue
    }

    try {
      const result = await ctx.send(message.method, message.params)
      message.resolve(result)
    } catch (error) {
      message.reject(error instanceof Error ? error : new Error('queued_message_failed'))
    }
  }
}

export function startHeartbeat(ctx: AutoHealingCDP): void {
  stopHeartbeat(ctx)
  ctx.heartbeatTimer = setInterval(() => {
    if (!ctx.isConnected()) {
      return
    }

    void ctx.send('Runtime.evaluate', { expression: '1' })
      .then(() => ctx.emit('heartbeat'))
      .catch((error) => {
        console.warn('[AutoHealingCDP] Heartbeat failed:', error)
        void handleDisconnect(ctx)
      })
  }, ctx.config.heartbeatInterval)
}

export function stopHeartbeat(ctx: AutoHealingCDP): void {
  if (ctx.heartbeatTimer) {
    clearInterval(ctx.heartbeatTimer)
    ctx.heartbeatTimer = null
  }
}

export function clearReconnectTimer(ctx: AutoHealingCDP): void {
  if (ctx.reconnectTimer) {
    clearTimeout(ctx.reconnectTimer)
    ctx.reconnectTimer = null
  }
}

export function setState(ctx: AutoHealingCDP, state: ConnectionState): void {
  const previous = ctx.state
  ctx.state = state
  if (previous !== state) {
    ctx.emit('stateChange', state, previous)
  }
}

export function socketsOpen(ctx: AutoHealingCDP): boolean {
  return ctx.browserSocket?.readyState === WebSocket.OPEN && ctx.targetSocket?.readyState === WebSocket.OPEN
}
