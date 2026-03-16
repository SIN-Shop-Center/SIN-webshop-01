#!/usr/bin/env node

import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import ts from 'typescript'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const functionsRoot = join(root, 'workers', 'edge', 'functions')
const files = []

function walk(dir) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    const st = statSync(full)
    if (st.isDirectory()) {
      walk(full)
      continue
    }
    if (full.endsWith('.ts')) {
      files.push(full)
    }
  }
}

walk(functionsRoot)

if (files.length === 0) {
  console.error(`No TypeScript files found under ${functionsRoot}`)
  process.exit(1)
}

const failures = []
const importPattern = /from\s+['\"](.+?)['\"]/g

function resolveImport(baseFile, specifier) {
  if (!specifier.startsWith('.')) {
    return true
  }
  const baseDir = dirname(baseFile)
  const raw = resolve(baseDir, specifier)
  const candidates = [
    raw,
    `${raw}.ts`,
    `${raw}.tsx`,
    `${raw}.js`,
    join(raw, 'index.ts'),
    join(raw, 'index.tsx'),
    join(raw, 'index.js'),
  ]
  return candidates.some((candidate) => existsSync(candidate))
}

for (const file of files) {
  const source = readFileSync(file, 'utf8')
  const transpiled = ts.transpileModule(source, {
    fileName: file,
    reportDiagnostics: true,
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.ESNext,
      moduleResolution: ts.ModuleResolutionKind.Bundler,
    },
  })
  for (const diagnostic of transpiled.diagnostics || []) {
    const message = ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n')
    failures.push(`${file}: ${message}`)
  }

  importPattern.lastIndex = 0
  let match
  while ((match = importPattern.exec(source)) !== null) {
    const specifier = match[1]
    if (!resolveImport(file, specifier)) {
      failures.push(`${file}: unresolved import ${specifier}`)
    }
  }
}

if (failures.length > 0) {
  console.error(`workers/edge static checks failed (${failures.length} issue${failures.length === 1 ? '' : 's'}):`)
  for (const failure of failures) {
    console.error(`- ${failure}`)
  }
  process.exit(1)
}

console.log(`workers/edge static checks passed (${files.length} TypeScript files).`)
