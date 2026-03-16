import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'

const execFileAsync = promisify(execFile)
const scriptPath = path.join(process.cwd(), 'scripts', 'check-governance-preflight.mjs')
const mandatoryQueries = [
  'Welche <critical_invariant> und <halt_condition> gelten fuer dieses Projekt?',
  'Welche Verzeichnisstruktur und Dateien muessen initial angelegt werden (Greenpause, no code)?',
  'Welche Dokumente sind bis Definition of Done Pflicht (README, Architektur, ADR, RFC, Security, SRE, Standards)?',
  'Welche Regeln muessen in AGENTS.md stehen, damit jeder Coder-Agent immer NotebookLM als Richter nutzt?',
  'Welche <interaction_invariant> und <security_gate> gelten fuer Browser-Workflows?',
]

test('governance preflight passes with clean doc tree and citation-backed queries', async () => {
  const repoDir = await createRepoFixture()
  const nlmPath = await createFakeNlm(repoDir)

  const { stdout } = await execFileAsync('node', [scriptPath], {
    cwd: repoDir,
    env: buildScriptEnv({ NLM_BIN: nlmPath }),
  })

  assert.match(stdout, /Governance preflight passed \(5 mandatory queries, source_count=1\)\./)
})

test('governance preflight fails on nested markdown drift outside AGENTS', async () => {
  const repoDir = await createRepoFixture()
  const nlmPath = await createFakeNlm(repoDir)

  await fs.writeFile(path.join(repoDir, 'workers', 'n8n', 'README.md'), '# changed\n', 'utf8')

  await assert.rejects(
    execFileAsync('node', [scriptPath], {
      cwd: repoDir,
      env: buildScriptEnv({ NLM_BIN: nlmPath }),
    }),
    (error) => {
      assert.match(error.stderr, /BLOCKED: Local documentation drift detected outside AGENTS\.md\./)
      assert.match(error.stderr, /workers\/n8n\/README\.md/)
      return true
    },
  )
})

test('governance preflight fails when mandatory query evidence is missing', async () => {
  const repoDir = await createRepoFixture()
  const nlmPath = await createFakeNlm(repoDir, {
    queryOverrides: {
      [mandatoryQueries[0]]: {
        value: {
          answer: 'Answer without citations',
          sources_used: ['source-1'],
          citations: {},
        },
      },
    },
  })

  await assert.rejects(
    execFileAsync('node', [scriptPath], {
      cwd: repoDir,
      env: buildScriptEnv({ NLM_BIN: nlmPath }),
    }),
    (error) => {
      assert.match(error.stderr, /BLOCKED: Mandatory NotebookLM query failed\./)
      assert.match(error.stderr, /Missing citation evidence from mandatory NotebookLM query\./)
      assert.match(error.stderr, /critical_invariant/)
      return true
    },
  )
})

test('governance preflight fails when NotebookLM is resource exhausted', async () => {
  const repoDir = await createRepoFixture()
  const nlmPath = await createFakeNlm(repoDir, {
    queryFailures: Object.fromEntries(
      mandatoryQueries.map((question) => [
        question,
        'Error: Google rejected the query (error code 8: RESOURCE_EXHAUSTED)',
      ]),
    ),
  })

  await assert.rejects(
    execFileAsync('node', [scriptPath], {
      cwd: repoDir,
      env: buildScriptEnv({ NLM_BIN: nlmPath }),
    }),
    (error) => {
      assert.match(error.stderr, /BLOCKED: Mandatory NotebookLM query failed\./)
      assert.match(error.stderr, /RESOURCE_EXHAUSTED/)
      return true
    },
  )
})

test('governance preflight uses cached evidence when NotebookLM is resource exhausted', async () => {
  const repoDir = await createRepoFixture()
  const nlmPath = await createFakeNlm(repoDir, {
    queryFailures: Object.fromEntries(
      mandatoryQueries.map((question) => [
        question,
        'Error: Google rejected the query (error code 8: RESOURCE_EXHAUSTED)',
      ]),
    ),
  })

  const cacheDir = path.join(repoDir, '.notebooklm-mcp-cli')
  await fs.mkdir(cacheDir, { recursive: true })
  await fs.writeFile(
    path.join(cacheDir, 'governance-preflight-cache.json'),
    `${JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        notebookId: '784c4f30-b524-41d9-a0cc-3752b8303cf3',
        sourceCountRequired: 1,
        sourceIds: ['source-1'],
        entries: Object.fromEntries(
          mandatoryQueries.map((question) => [
            question,
            {
              citationCount: 1,
              sourcesUsed: ['source-1'],
              verifiedAt: new Date().toISOString(),
            },
          ]),
        ),
      },
      null,
      2,
    )}\n`,
    'utf8',
  )

  const { stdout } = await execFileAsync('node', [scriptPath], {
    cwd: repoDir,
    env: buildScriptEnv({ NLM_BIN: nlmPath }),
  })

  assert.match(stdout, /Using cached evidence snapshot\./)
  assert.match(stdout, /Governance preflight passed \(5 mandatory queries, source_count=1\)\./)
})

test('governance preflight bootstraps a local nlm profile from the readable home store', async () => {
  const repoDir = await createRepoFixture()
  const homeDir = await fs.mkdtemp(path.join(os.tmpdir(), 'governance-preflight-home-'))
  const nlmPath = await createFakeNlm(repoDir, { assertBootstrap: true })

  const legacyProfileDir = path.join(homeDir, '.notebooklm-mcp-cli', 'profiles', 'default')
  await fs.mkdir(legacyProfileDir, { recursive: true })
  await fs.writeFile(path.join(legacyProfileDir, 'cookies.json'), '[{"name":"SID","value":"x"}]\n', 'utf8')
  await fs.writeFile(path.join(legacyProfileDir, 'metadata.json'), '{"email":"demo@example.com"}\n', 'utf8')

  const { stdout } = await execFileAsync('node', [scriptPath], {
    cwd: repoDir,
    env: {
      ...buildScriptEnv(),
      HOME: homeDir,
      NLM_BIN: nlmPath,
    },
  })

  assert.match(stdout, /Governance preflight passed/)
  await fs.access(path.join(repoDir, '.notebooklm-mcp-cli', 'profiles', 'default', 'cookies.json'))
  await fs.access(path.join(repoDir, '.notebooklm-mcp-cli', 'profiles', 'default', 'metadata.json'))
})


async function createRepoFixture() {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'governance-preflight-'))
  await execFileAsync('git', ['init'], { cwd: dir })
  await execFileAsync('git', ['config', 'user.email', 'codex@example.test'], { cwd: dir })
  await execFileAsync('git', ['config', 'user.name', 'Codex'], { cwd: dir })

  await fs.writeFile(
    path.join(dir, 'AGENTS.md'),
    [
      '# NotebookLM Judge Protocol',
      '',
      '- `PROJECT_NOTEBOOK_ID=784c4f30-b524-41d9-a0cc-3752b8303cf3`',
      '- `SOURCE_COUNT_REQUIRED=1`',
      '',
      '```bash',
      ...mandatoryQueries.map((question) => `nlm notebook query "$PROJECT_NOTEBOOK_ID" "${question}" --json`),
      '```',
    ].join('\n'),
    'utf8',
  )
  await fs.writeFile(path.join(dir, 'README.md'), '# repo\n', 'utf8')
  await fs.mkdir(path.join(dir, 'workers', 'n8n'), { recursive: true })
  await fs.writeFile(path.join(dir, 'workers', 'n8n', 'README.md'), '# worker docs\n', 'utf8')

  await execFileAsync('git', ['add', '.'], { cwd: dir })
  await execFileAsync('git', ['commit', '-m', 'fixture'], { cwd: dir })

  return dir
}

function buildScriptEnv(overrides = {}) {
  return {
    ...process.env,
    NLM_QUERY_RETRIES: '0',
    NLM_QUERY_RETRY_DELAY_MS: '1',
    ...overrides,
  }
}

async function createFakeNlm(repoDir, options = {}) {
  const nlmPath = path.join(repoDir, 'fake-nlm.mjs')
  const config = {
    assertBootstrap: options.assertBootstrap === true,
    failQueries: options.failQueries === true,
    loginExitCode: options.loginExitCode ?? 0,
    notebookId: '784c4f30-b524-41d9-a0cc-3752b8303cf3',
    sourceCount: options.sourceCount ?? 1,
    sourceType: options.sourceType ?? 'google_docs',
    queryOverrides: options.queryOverrides ?? {},
    queryFailures: options.queryFailures ?? {},
  }

  await fs.writeFile(
    nlmPath,
    [
      '#!/usr/bin/env node',
      'const fs = await import("node:fs")',
      'const path = await import("node:path")',
      'const args = process.argv.slice(2)',
      `const config = ${JSON.stringify(config)}`,
      `const questions = new Set(${JSON.stringify(mandatoryQueries)})`,
      'function defaultQueryPayload(question) {',
      '  return {',
      '    value: {',
      '      answer: `Answer for ${question} [1]`,',
      '      sources_used: ["source-1"],',
      '      citations: { "1": "source-1" },',
      '    },',
      '  }',
      '}',
      'function assertBootstrappedProfile() {',
      '  if (!config.assertBootstrap) return',
      '  const storage = process.env.NOTEBOOKLM_MCP_CLI_PATH',
      '  if (!storage) { console.error("missing storage env"); process.exit(1) }',
      '  const cookies = path.join(storage, "profiles", "default", "cookies.json")',
      '  const metadata = path.join(storage, "profiles", "default", "metadata.json")',
      '  if (!fs.existsSync(cookies) || !fs.existsSync(metadata)) { console.error("missing bootstrapped profile"); process.exit(1) }',
      '}',
      'if (args[0] === "--version") { console.log("nlm version test"); process.exit(0) }',
      'if (args[0] === "login" && args[1] === "--check") { assertBootstrappedProfile(); process.exit(config.loginExitCode ?? 0) }',
      'if (args[0] === "notebook" && args[1] === "get") {',
      '  console.log(JSON.stringify({ value: { notebook_id: config.notebookId, title: "Fixture Notebook", source_count: config.sourceCount, sources: Array.from({ length: config.sourceCount }, (_, index) => ({ id: `source-${index + 1}`, title: `Source ${index + 1}` })) } }))',
      '  process.exit(0)',
      '}',
      'if (args[0] === "source" && args[1] === "list") {',
      '  console.log(JSON.stringify(Array.from({ length: config.sourceCount }, (_, index) => ({ id: `source-${index + 1}`, title: `Source ${index + 1}`, type: config.sourceType }))))',
      '  process.exit(0)',
      '}',
      'if (args[0] === "notebook" && args[1] === "query") {',
      '  if (config.failQueries) { console.error("query should not run"); process.exit(1) }',
      '  const question = args[3]',
      '  if (!questions.has(question)) { console.error(`unexpected question: ${question}`); process.exit(1) }',
      '  const failure = config.queryFailures?.[question]',
      '  if (failure) { console.error(failure); process.exit(1) }',
      '  const override = config.queryOverrides?.[question]',
      '  console.log(JSON.stringify(override || defaultQueryPayload(question)))',
      '  process.exit(0)',
      '}',
      'console.error(`unexpected args: ${args.join(" ")}`)',
      'process.exit(1)',
    ].join('\n'),
    'utf8',
  )
  await fs.chmod(nlmPath, 0o755)
  return nlmPath
}
