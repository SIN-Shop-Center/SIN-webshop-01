#!/usr/bin/env node

const SUPPORTED_NODE_MAJORS = new Set([20, 22])
const major = Number.parseInt((process.versions.node || '').split('.')[0] || '', 10)

if (!SUPPORTED_NODE_MAJORS.has(major)) {
  console.error(
    [
      `Unsupported Node.js runtime: ${process.version}`,
      'Use Node.js 20.x or 22.x (LTS) for this repository.',
      'Reason: Next.js 14 build stability in this project requires an LTS runtime.',
    ].join('\n'),
  )
  process.exit(1)
}
