import WebSocket from 'ws'
import { EventEmitter } from 'events'
import { SessionPersistence } from './session-persistence'
import { attachToTarget, connectBrowser } from './auto-healing-cdp-connection'
import {
  clearReconnectTimer,
  handleDisconnect,
  processMessageQueue,
  restoreSession,
  scheduleReconnect,
  setState,
  socketsOpen,
  startHeartbeat,
  stopHeartbeat,
} from './auto-healing-cdp-recovery'

export interface AutoHealingCDPConfig {
  browserWSEndpoint: string
  maxReconnectAttempts: number
  reconnectDelay: number
  maxReconnectDelay: number
  heartbeatInterval: number
  connectionTimeout: number
  enableSessionPersistence: boolean
  sessionDataDir: string
}

const DEFAULT_CONFIG: AutoHealingCDPConfig = {
  browserWSEndpoint: 'ws://localhost:50070',
  maxReconnectAttempts: 5,
  reconnectDelay: 1000,
  maxReconnectDelay: 30000,
  heartbeatInterval: 30000,
  connectionTimeout: 10000,
  enableSessionPersistence: true,
  sessionDataDir: './session-data',
}

export enum ConnectionState {
  DISCONNECTED = 'disconnected',
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  RECONNECTING = 'reconnecting',
  ERROR = 'error',
}

export interface CDPTarget {
  targetId: string
  type: string
  title: string
  url: string
  attached: boolean
  browserContextId?: string
}

export type QueuedMessage = {
  method: string
  params?: Record<string, unknown>
  resolve: (value: unknown) => void
  reject: (reason: Error) => void
}

export class AutoHealingCDP extends EventEmitter {
  config: AutoHealingCDPConfig
  browserSocket: WebSocket | null = null
  targetSocket: WebSocket | null = null
  state: ConnectionState = ConnectionState.DISCONNECTED
  reconnectAttempts = 0
  reconnectTimer: NodeJS.Timeout | null = null
  heartbeatTimer: NodeJS.Timeout | null = null
  sessionPersistence: SessionPersistence | null = null
  currentTargetId: string | null = null
  messageQueue: QueuedMessage[] = []
  pendingMessages = new Map<number, { resolve: (value: unknown) => void; reject: (reason: Error) => void }>()
  messageId = 0

  constructor(config: Partial<AutoHealingCDPConfig> = {}) {
    super()
    this.config = { ...DEFAULT_CONFIG, ...config }
    if (this.config.enableSessionPersistence) {
      this.sessionPersistence = new SessionPersistence({ dataDir: this.config.sessionDataDir })
    }
  }

  getState(): ConnectionState {
    return this.state
  }

  isConnected(): boolean {
    return this.state === ConnectionState.CONNECTED && socketsOpen(this)
  }

  async connect(): Promise<void> {
    if (this.state === ConnectionState.CONNECTED || this.state === ConnectionState.CONNECTING) {
      return
    }

    setState(this, ConnectionState.CONNECTING)
    try {
      await connectBrowser(this)
      await attachToTarget(this)
      this.reconnectAttempts = 0
      setState(this, ConnectionState.CONNECTED)
      startHeartbeat(this)
      if (this.sessionPersistence) {
        await restoreSession(this)
      }
      await processMessageQueue(this)
      this.emit('connected')
    } catch (error) {
      setState(this, ConnectionState.ERROR)
      this.emit('error', error)
      await scheduleReconnect(this)
    }
  }

  async disconnect(): Promise<void> {
    stopHeartbeat(this)
    clearReconnectTimer(this)

    if (this.sessionPersistence && this.isConnected()) {
      try {
        await this.sessionPersistence.saveSession()
      } catch (error) {
        console.warn('[AutoHealingCDP] Failed to save session on disconnect:', error)
      }
    }

    this.targetSocket?.close(); this.targetSocket = null
    this.browserSocket?.close(); this.browserSocket = null
    this.currentTargetId = null
    setState(this, ConnectionState.DISCONNECTED)
    this.emit('disconnected')
  }

  async send(method: string, params?: Record<string, unknown>): Promise<unknown> {
    if (!this.isConnected()) {
      return new Promise((resolve, reject) => {
        this.messageQueue.push({ method, params, resolve, reject })
      })
    }

    const id = ++this.messageId
    return new Promise((resolve, reject) => {
      this.pendingMessages.set(id, { resolve, reject })
      setTimeout(() => {
        if (this.pendingMessages.has(id)) {
          this.pendingMessages.delete(id)
          reject(new Error(`Timeout waiting for response to ${method}`))
        }
      }, this.config.connectionTimeout)

      if (this.targetSocket?.readyState === WebSocket.OPEN) {
        this.targetSocket.send(JSON.stringify({ id, method, params }))
      } else {
        reject(new Error('Target socket not connected'))
      }
    })
  }

  async getTargets(): Promise<CDPTarget[]> {
    const result = (await this.send('Target.getTargets')) as { targetInfos: CDPTarget[] }
    return result.targetInfos
  }

  async createTarget(url: string): Promise<string> {
    const result = (await this.send('Target.createTarget', { url })) as { targetId: string }
    return result.targetId
  }

  async closeTarget(targetId: string): Promise<void> {
    await this.send('Target.closeTarget', { targetId })
  }

  async navigate(url: string, waitUntil: 'load' | 'domcontentloaded' | 'networkidle0' | 'networkidle2' = 'load'): Promise<unknown> {
    await this.send('Page.enable')
    const result = await this.send('Page.navigate', { url })
    if (waitUntil === 'load' || waitUntil === 'domcontentloaded') {
      await this.waitForEvent('Page.loadEventFired', 30000)
    }
    return result
  }

  waitForEvent(event: string, timeout = 30000): Promise<unknown> {
    return new Promise((resolve, reject) => {
      const handler = (params: unknown) => {
        this.off(event, handler)
        clearTimeout(timer)
        resolve(params)
      }
      const timer = setTimeout(() => {
        this.off(event, handler)
        reject(new Error(`Timeout waiting for event: ${event}`))
      }, timeout)
      this.on(event, handler)
    })
  }

  async handleDisconnect(): Promise<void> {
    await handleDisconnect(this)
  }
}

let globalAutoHealingCDP: AutoHealingCDP | null = null

export function getAutoHealingCDP(config?: Partial<AutoHealingCDPConfig>): AutoHealingCDP {
  if (!globalAutoHealingCDP) {
    globalAutoHealingCDP = new AutoHealingCDP(config)
  }
  return globalAutoHealingCDP
}

export function resetAutoHealingCDP(): void {
  globalAutoHealingCDP = null
}

export default AutoHealingCDP
