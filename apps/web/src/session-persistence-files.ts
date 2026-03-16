import * as fs from 'fs'
import * as path from 'path'
import { promisify } from 'util'
import type { SessionData } from './session-persistence-types'

const mkdir = promisify(fs.mkdir)
const writeFile = promisify(fs.writeFile)
const readFile = promisify(fs.readFile)
const unlink = promisify(fs.unlink)
const readdir = promisify(fs.readdir)

export async function ensureSessionDataDir(dataDir: string): Promise<void> {
  await mkdir(dataDir, { recursive: true })
}

export function getSessionFilePath(dataDir: string, sessionId: string): string {
  return path.join(dataDir, `${sessionId}.json`)
}

export async function writeSessionFile(filePath: string, data: string): Promise<void> {
  await writeFile(filePath, data, 'utf8')
}

export async function readSessionFile(filePath: string): Promise<string> {
  return readFile(filePath, 'utf8')
}

export async function removeSessionFile(filePath: string): Promise<void> {
  await unlink(filePath)
}

export async function listSessionDir(dataDir: string): Promise<string[]> {
  return readdir(dataDir)
}

export function sessionFileExists(filePath: string): boolean {
  return fs.existsSync(filePath)
}

export async function loadSessionSummaries(dataDir: string): Promise<Array<{ sessionId: string; timestamp: number; url: string }>> {
  const files = await listSessionDir(dataDir)
  const sessions: Array<{ sessionId: string; timestamp: number; url: string }> = []

  for (const file of files) {
    if (!file.endsWith('.json')) {
      continue
    }
    const sessionID = file.replace(/\.json$/, '')
    const raw = await readSessionFile(getSessionFilePath(dataDir, sessionID))
    const parsed: SessionData = JSON.parse(raw)
    sessions.push({ sessionId: parsed.sessionId, timestamp: parsed.timestamp, url: parsed.url })
  }

  sessions.sort((a, b) => b.timestamp - a.timestamp)
  return sessions
}

export async function pruneOldSessionFiles(dataDir: string, maxSessions: number): Promise<string[]> {
  const sessions = await loadSessionSummaries(dataDir)
  if (sessions.length <= maxSessions) {
    return []
  }
  const toDelete = sessions.slice(maxSessions)
  const deletedIDs: string[] = []
  for (const session of toDelete) {
    await removeSessionFile(getSessionFilePath(dataDir, session.sessionId))
    deletedIDs.push(session.sessionId)
  }
  return deletedIDs
}
