export interface SessionData {
  sessionId: string
  timestamp: number
  url: string
  cookies: Array<{
    name: string
    value: string
    domain: string
    path: string
    expires?: number
    httpOnly?: boolean
    secure?: boolean
    sameSite?: string
  }>
  localStorage: Record<string, string>
  sessionStorage: Record<string, string>
  scrollPosition: { x: number; y: number }
  formData: Record<string, string>
  metadata?: {
    userAgent?: string
    viewport?: { width: number; height: number }
    timezone?: string
    language?: string
  }
}

export interface SessionPersistenceConfig {
  dataDir: string
  autoSaveInterval: number
  maxSessions: number
  encryptSensitiveData: boolean
  excludedFields: string[]
}

export interface CDPClient {
  send: (method: string, params?: Record<string, unknown>) => Promise<unknown>
  on: (event: string, callback: (...args: unknown[]) => void) => void
  removeListener: (event: string, callback: (...args: unknown[]) => void) => void
}

export const DEFAULT_SESSION_PERSISTENCE_CONFIG: SessionPersistenceConfig = {
  dataDir: './session-data',
  autoSaveInterval: 30000,
  maxSessions: 10,
  encryptSensitiveData: false,
  excludedFields: ['password', 'token', 'secret', 'apiKey', 'auth'],
}
