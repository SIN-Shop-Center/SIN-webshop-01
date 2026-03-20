import { existsSync, rmSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..')
const nextDir = join(repoRoot, 'apps', 'web', '.next')

if (existsSync(nextDir)) {
  rmSync(nextDir, { recursive: true, force: true })
}
