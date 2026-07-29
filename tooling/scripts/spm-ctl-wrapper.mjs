#!/usr/bin/env node

import { execFile } from 'node:child_process'
import { promisify } from 'node:util'

const execFileAsync = promisify(execFile)

async function main() {
  const args = process.argv.slice(2)
  const normalizedArgs = args[0] === '--' ? args.slice(1) : args
  const { stdout, stderr } = await execFileAsync(
    'pnpm',
    ['--filter', '@simone/spm-a2a', 'ctl', ...normalizedArgs],
    {
      env: process.env,
      maxBuffer: 20 * 1024 * 1024,
    },
  )
  if (stdout) {
    process.stdout.write(stdout)
  }
  if (stderr) {
    process.stderr.write(stderr)
  }
}

main().catch((error) => {
  const stdout = String(error?.stdout || '')
  const stderr = String(error?.stderr || '')
  if (stdout) {
    process.stdout.write(stdout)
  }
  if (stderr) {
    process.stderr.write(stderr)
  }
  const message = error instanceof Error ? error.message : String(error)
  process.stderr.write(`${message}\n`)
  process.exitCode = 1
})
