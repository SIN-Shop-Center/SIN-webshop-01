import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { createSPMStore } from '../src/index.mjs'

test('file backend stores, reads and binds targets', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'spm-core-'))
  process.env.SPM_SECRET_BACKEND = 'file'
  process.env.SPM_STATE_DIR = dir
  process.env.SPM_MASTER_KEY = Buffer.alloc(32, 7).toString('base64')

  const store = createSPMStore()
  await store.putSecret({ name: 'HELLO_SECRET', value: 'world', description: 'demo' })

  const masked = await store.getSecret({ name: 'HELLO_SECRET', reveal: false })
  const revealed = await store.getSecret({ name: 'HELLO_SECRET', reveal: true })

  assert.equal(Boolean(masked?.maskedValue?.includes('•••')), true)
  assert.equal(revealed?.value, 'world')

  await store.bindTarget({
    name: 'HELLO_SECRET',
    target: {
      id: 'demo-target',
      kind: 'github_actions_repo',
      authSecretName: 'GITHUB_TOKEN',
      params: { owner: 'demo', repo: 'demo' },
    },
  })

  const targets = await store.listTargets({ name: 'HELLO_SECRET' })
  assert.equal(targets.length, 1)
  assert.equal(targets[0].id, 'demo-target')
})

test('file backend accepts hugging face target bindings', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'spm-core-hf-'))
  process.env.SPM_SECRET_BACKEND = 'file'
  process.env.SPM_STATE_DIR = dir
  process.env.SPM_MASTER_KEY = Buffer.alloc(32, 9).toString('base64')

  const store = createSPMStore()
  await store.putSecret({ name: 'HF_DEMO_SECRET', value: 'value' })
  await store.bindTarget({
    name: 'HF_DEMO_SECRET',
    target: {
      id: 'hf-space',
      kind: 'huggingface_space_secret',
      authSecretName: 'HUGGINGFACE_TOKEN',
      params: { repoId: 'delqhi/sin-passwordmanager' },
    },
  })

  const targets = await store.listTargets({ name: 'HF_DEMO_SECRET' })
  assert.equal(targets.length, 1)
  assert.equal(targets[0].kind, 'huggingface_space_secret')
})
