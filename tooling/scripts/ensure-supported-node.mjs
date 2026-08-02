#!/usr/bin/env node

const SUPPORTED_NODE_MAJORS = new Set([20, 22, 24])
const major = Number.parseInt((process.versions.node || '').split('.')[0] || '', 10)

if (!SUPPORTED_NODE_MAJORS.has(major)) {
  console.error(
    [
      `Unsupported Node.js runtime: ${process.version}`,
      'Use Node.js 20.x, 22.x or 24.x (LTS) for this repository.',
      'Reason: Next.js 16 requires Node >=20.9; only LTS runtimes are supported.',
    ].join('\n'),
  )
  process.exit(1)
}
