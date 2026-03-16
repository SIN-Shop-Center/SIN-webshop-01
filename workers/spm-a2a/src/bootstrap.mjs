import fs from 'node:fs/promises'
import path from 'node:path'
import os from 'node:os'
import { createSPMStore } from '@simone/spm-core'

async function main() {
  const store = createSPMStore()
  await fs.mkdir(store.config.stateDir, { recursive: true })
  await fs.writeFile(
    path.join(store.config.stateDir, 'README.txt'),
    [
      'SIN-Passwordmanager state directory',
      `backend=${store.config.backend}`,
      'Secret values are managed via the SPM A2A agent and not stored in the repo.',
      '',
    ].join('\n'),
    'utf8',
  )
  console.log(JSON.stringify({
    ok: true,
    stateDir: store.config.stateDir,
    backend: store.config.backend,
    machine: os.hostname(),
  }, null, 2))
}

main().catch((error) => {
  const message = error instanceof Error ? error.stack || error.message : String(error)
  process.stderr.write(`${message}\n`)
  process.exitCode = 1
})
