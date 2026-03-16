import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'

const execFileAsync = promisify(execFile)
const guardLinesScriptPath = path.join(process.cwd(), 'scripts', 'guard-lines.mjs')
const baselineValidateScriptPath = path.join(process.cwd(), 'scripts', 'guard-baseline-validate.mjs')

test('guard-lines inspects oversized files under dev/', async () => {
  const repoDir = await createFixtureRepo()
  await fs.mkdir(path.join(repoDir, 'dev'), { recursive: true })
  await fs.writeFile(path.join(repoDir, 'dev', 'oversized.ts'), `${'const x = 1\n'.repeat(221)}`, 'utf8')

  await assert.rejects(
    execFileAsync('node', [guardLinesScriptPath], { cwd: repoDir }),
    (error) => {
      assert.match(error.stderr, /dev\/oversized\.ts: 221 lines/)
      return true
    },
  )
})

test('guard baseline validation fails on stale line and complexity pins', async () => {
  const repoDir = await createFixtureRepo()
  const scriptsDir = path.join(repoDir, 'scripts')
  const srcDir = path.join(repoDir, 'apps', 'web', 'src')
  await fs.mkdir(srcDir, { recursive: true })

  await fs.writeFile(path.join(srcDir, 'small.ts'), 'export const value = 1\n', 'utf8')
  await fs.writeFile(path.join(srcDir, 'branchy.ts'), `${'if (a) { value += 1 }\n'.repeat(121)}`, 'utf8')
  await fs.writeFile(
    path.join(scriptsDir, 'guard-lines-baseline.json'),
    JSON.stringify({ 'apps/web/src/small.ts': 221 }, null, 2),
    'utf8',
  )
  await fs.writeFile(
    path.join(scriptsDir, 'guard-complexity-baseline.json'),
    JSON.stringify({ 'apps/web/src/branchy.ts': 130 }, null, 2),
    'utf8',
  )

  await assert.rejects(
    execFileAsync('node', [baselineValidateScriptPath], { cwd: repoDir }),
    (error) => {
      assert.match(error.stderr, /apps\/web\/src\/small\.ts: no longer needs a line baseline pin/)
      assert.match(error.stderr, /apps\/web\/src\/branchy\.ts: complexity baseline 130 must match current branch token count 121/)
      return true
    },
  )
})

async function createFixtureRepo() {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'guard-baseline-'))
  await fs.mkdir(path.join(dir, 'scripts'), { recursive: true })
  await fs.writeFile(path.join(dir, 'scripts', 'guard-lines-baseline.json'), '{}\n', 'utf8')
  await fs.writeFile(path.join(dir, 'scripts', 'guard-complexity-baseline.json'), '{}\n', 'utf8')
  return dir
}
