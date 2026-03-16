import { execFile } from 'node:child_process'
import { promisify } from 'node:util'

const execFileAsync = promisify(execFile)

export async function openExternalURL(url: string): Promise<{ launcher: string }> {
  if (!url.trim()) {
    throw new Error('browser_url_missing')
  }

  if (process.platform === 'darwin') {
    await execFileAsync('open', [url])
    return { launcher: 'open' }
  }

  if (process.platform === 'win32') {
    await execFileAsync('cmd', ['/c', 'start', '', url])
    return { launcher: 'start' }
  }

  await execFileAsync('xdg-open', [url])
  return { launcher: 'xdg-open' }
}
