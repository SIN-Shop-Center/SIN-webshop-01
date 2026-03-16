import {
  ensureSessionDataDir,
  getSessionFilePath,
  loadSessionSummaries,
  pruneOldSessionFiles,
  readSessionFile,
  removeSessionFile,
  sessionFileExists,
  writeSessionFile,
} from './session-persistence-files'
import { applySessionState, captureSessionState, filterSensitiveSessionData } from './session-persistence-browser'
import { DEFAULT_SESSION_PERSISTENCE_CONFIG, type CDPClient, type SessionData, type SessionPersistenceConfig } from './session-persistence-types'

export type { CDPClient, SessionData, SessionPersistenceConfig }

export class SessionPersistence {
  private config: SessionPersistenceConfig
  private currentSessionId: string | null = null
  private autoSaveTimer: NodeJS.Timeout | null = null
  private cdpClient: CDPClient | null = null
  private isInitialized = false

  constructor(config: Partial<SessionPersistenceConfig> = {}) {
    this.config = { ...DEFAULT_SESSION_PERSISTENCE_CONFIG, ...config }
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return
    }

    try {
      await ensureSessionDataDir(this.config.dataDir)
      this.isInitialized = true
      console.log(`[SessionPersistence] Initialized with data directory: ${this.config.dataDir}`)
    } catch (error) {
      console.error('[SessionPersistence] Failed to initialize:', error)
      throw new Error(`Failed to initialize session persistence: ${error}`)
    }
  }

  setCDPClient(client: CDPClient): void {
    this.cdpClient = client
  }

  generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  async startSession(sessionId?: string): Promise<string> {
    await this.initialize()
    this.currentSessionId = sessionId || this.generateSessionId()
    console.log(`[SessionPersistence] Started session: ${this.currentSessionId}`)
    this.startAutoSave()
    return this.currentSessionId
  }

  async stopSession(): Promise<void> {
    this.stopAutoSave()
    if (this.currentSessionId) {
      console.log(`[SessionPersistence] Stopped session: ${this.currentSessionId}`)
      this.currentSessionId = null
    }
  }

  getCurrentSessionId(): string | null {
    return this.currentSessionId
  }

  async saveSession(sessionId?: string): Promise<SessionData> {
    await this.initialize()

    const targetSessionId = sessionId || this.currentSessionId
    if (!targetSessionId) {
      throw new Error('No active session to save')
    }
    if (!this.cdpClient) {
      throw new Error('CDP client not set')
    }

    try {
      const sessionData = await captureSessionState(this.cdpClient, targetSessionId)
      const filteredData = filterSensitiveSessionData(sessionData, this.config.excludedFields)
      const filePath = getSessionFilePath(this.config.dataDir, targetSessionId)
      await writeSessionFile(filePath, JSON.stringify(filteredData, null, 2))
      console.log(`[SessionPersistence] Saved session: ${targetSessionId}`)
      await this.cleanupOldSessions()
      return filteredData
    } catch (error) {
      console.error('[SessionPersistence] Failed to save session:', error)
      throw new Error(`Failed to save session: ${error}`)
    }
  }

  async restoreSession(sessionId: string): Promise<SessionData> {
    await this.initialize()
    if (!this.cdpClient) {
      throw new Error('CDP client not set')
    }

    try {
      const filePath = getSessionFilePath(this.config.dataDir, sessionId)
      const data = await readSessionFile(filePath)
      const sessionData: SessionData = JSON.parse(data)
      await applySessionState(this.cdpClient, sessionData)
      this.currentSessionId = sessionId
      console.log(`[SessionPersistence] Restored session: ${sessionId}`)
      this.startAutoSave()
      return sessionData
    } catch (error) {
      console.error('[SessionPersistence] Failed to restore session:', error)
      throw new Error(`Failed to restore session: ${error}`)
    }
  }

  async clearSession(sessionId?: string): Promise<void> {
    const targetSessionId = sessionId || this.currentSessionId
    if (!targetSessionId) {
      return
    }

    try {
      const filePath = getSessionFilePath(this.config.dataDir, targetSessionId)
      if (sessionFileExists(filePath)) {
        await removeSessionFile(filePath)
        console.log(`[SessionPersistence] Cleared session: ${targetSessionId}`)
      }
      if (targetSessionId === this.currentSessionId) {
        this.currentSessionId = null
        this.stopAutoSave()
      }
    } catch (error) {
      console.error('[SessionPersistence] Failed to clear session:', error)
      throw new Error(`Failed to clear session: ${error}`)
    }
  }

  async listSessions(): Promise<Array<{ sessionId: string; timestamp: number; url: string }>> {
    await this.initialize()
    try {
      return await loadSessionSummaries(this.config.dataDir)
    } catch (error) {
      console.error('[SessionPersistence] Failed to list sessions:', error)
      return []
    }
  }

  async sessionExists(sessionId: string): Promise<boolean> {
    return sessionFileExists(getSessionFilePath(this.config.dataDir, sessionId))
  }

  private startAutoSave(): void {
    this.stopAutoSave()
    this.autoSaveTimer = setInterval(async () => {
      if (this.currentSessionId && this.cdpClient) {
        try {
          await this.saveSession(this.currentSessionId)
        } catch (error) {
          console.error('[SessionPersistence] Auto-save failed:', error)
        }
      }
    }, this.config.autoSaveInterval)

    console.log(`[SessionPersistence] Auto-save started (${this.config.autoSaveInterval}ms interval)`)
  }

  private stopAutoSave(): void {
    if (!this.autoSaveTimer) {
      return
    }
    clearInterval(this.autoSaveTimer)
    this.autoSaveTimer = null
    console.log('[SessionPersistence] Auto-save stopped')
  }

  private async cleanupOldSessions(): Promise<void> {
    try {
      const deletedIDs = await pruneOldSessionFiles(this.config.dataDir, this.config.maxSessions)
      for (const sessionID of deletedIDs) {
        try {
          console.log(`[SessionPersistence] Cleaned up old session: ${sessionID}`)
        } catch (error) {
          console.warn(`[SessionPersistence] Failed to cleanup session ${sessionID}:`, error)
        }
      }
    } catch (error) {
      console.warn('[SessionPersistence] Failed to cleanup old sessions:', error)
    }
  }
}

let globalSessionPersistence: SessionPersistence | null = null

export function getSessionPersistence(config?: Partial<SessionPersistenceConfig>): SessionPersistence {
  if (!globalSessionPersistence) {
    globalSessionPersistence = new SessionPersistence(config)
  }
  return globalSessionPersistence
}

export function resetSessionPersistence(): void {
  globalSessionPersistence = null
}

export default SessionPersistence
