import { execFile } from 'node:child_process'
import { promisify } from 'node:util'

const execFileAsync = promisify(execFile)

export function createKeychainBackend({ serviceName }) {
  return {
    async put(name, value) {
      await execFileAsync('security', [
        'add-generic-password',
        '-U',
        '-a',
        `secret:${name}`,
        '-s',
        serviceName,
        '-w',
        value,
      ])
    },
    async get(name) {
      const { stdout } = await execFileAsync('security', [
        'find-generic-password',
        '-a',
        `secret:${name}`,
        '-s',
        serviceName,
        '-w',
      ])
      return String(stdout || '').trim()
    },
    async remove(name) {
      try {
        await execFileAsync('security', [
          'delete-generic-password',
          '-a',
          `secret:${name}`,
          '-s',
          serviceName,
        ])
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        if (!message.includes('could not be found')) {
          throw error
        }
      }
    },
  }
}
