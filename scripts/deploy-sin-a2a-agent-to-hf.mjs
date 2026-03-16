#!/usr/bin/env node

import crypto from 'node:crypto'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { createSPMStore } from '../packages/spm-core/src/index.mjs'

const execFileAsync = promisify(execFile)
const projectRoot = process.cwd()
const registryFile = path.join(projectRoot, 'config', 'sin-a2a', 'registry.json')

async function main() {
  const args = parseArgs(process.argv.slice(2))
  const agentSlug = String(args.agent || 'sin-passwordmanager').trim()
  const registry = JSON.parse(await fs.readFile(registryFile, 'utf8'))
  const agent = registry.agents.find((entry) => entry.slug === agentSlug)
  if (!agent) {
    throw new Error(`agent_not_found:${agentSlug}`)
  }
  if (agentSlug !== 'sin-passwordmanager') {
    throw new Error(`hf_bundle_unsupported_agent:${agentSlug}`)
  }

  const repoId = String(args.repo || `${agent.huggingFaceSpace.owner}/${agent.huggingFaceSpace.slug}`).trim()
  const publicBaseUrl = String(args['public-base-url'] || `https://${repoId.replace('/', '-')}.hf.space`).trim().replace(/\/$/, '')
  const dryRun = args['dry-run'] === 'true'
  const spmStore = createSPMStore()
  const hfToken = await loadSecretValue(spmStore, String(args['auth-secret'] || 'HUGGINGFACE_TOKEN').trim())

  const masterKeySecretName = String(
    args['master-key-secret'] || `SPM_MASTER_KEY__${agent.id.replace(/[^A-Z0-9_.-]/gi, '_').toUpperCase()}`,
  ).trim()
  const masterKey = await ensureMasterKey(spmStore, masterKeySecretName)
  const tmpRoot = await fs.mkdtemp(path.join(os.tmpdir(), `hf-space-${agent.slug}-`))
  const bundleRoot = path.join(tmpRoot, agent.slug)
  await buildSpmSpaceBundle({ agent, bundleRoot })

  if (dryRun) {
    process.stdout.write(JSON.stringify({
      ok: true,
      dryRun: true,
      agent: agent.slug,
      repoId,
      publicBaseUrl,
      bundleRoot,
      masterKeySecretName,
    }, null, 2) + '\n')
    return
  }

  await ensurePythonModule('huggingface_hub')
  await createOrUpdateSpace({
    repoId,
    hfToken,
    folderPath: bundleRoot,
    publicBaseUrl,
    masterKey,
    repoOwner: agent.huggingFaceSpace.owner,
    repoSlug: agent.huggingFaceSpace.slug,
  })

  process.stdout.write(JSON.stringify({
    ok: true,
    agent: agent.slug,
    repoId,
    publicBaseUrl,
    masterKeySecretName,
    bundleRoot,
  }, null, 2) + '\n')
}

async function buildSpmSpaceBundle({ agent, bundleRoot }) {
  await copyFile(path.join(projectRoot, 'package.json'), path.join(bundleRoot, 'package.json'))
  await copyFile(path.join(projectRoot, 'pnpm-lock.yaml'), path.join(bundleRoot, 'pnpm-lock.yaml'))
  await copyFile(path.join(projectRoot, 'pnpm-workspace.yaml'), path.join(bundleRoot, 'pnpm-workspace.yaml'))
  await copyTree(path.join(projectRoot, 'packages', 'spm-core'), path.join(bundleRoot, 'packages', 'spm-core'))
  await copyTree(path.join(projectRoot, 'workers', 'spm-a2a'), path.join(bundleRoot, 'workers', 'spm-a2a'))
  await copyTree(path.join(projectRoot, 'workers', 'spm-secret-sync-mcp'), path.join(bundleRoot, 'workers', 'spm-secret-sync-mcp'))
  await copyTree(path.join(projectRoot, agent.paths.agentRoot), path.join(bundleRoot, agent.paths.agentRoot))
  await copyFile(
    path.join(projectRoot, agent.paths.agentRoot, 'deploy', 'huggingface-space', 'Dockerfile'),
    path.join(bundleRoot, 'Dockerfile'),
  )
  await copyFile(
    path.join(projectRoot, agent.paths.agentRoot, 'deploy', 'huggingface-space', 'app.mjs'),
    path.join(bundleRoot, 'app.mjs'),
  )
  await copyFile(
    path.join(projectRoot, agent.paths.agentRoot, 'deploy', 'huggingface-space', 'README.md'),
    path.join(bundleRoot, 'README.md'),
  )
}

async function createOrUpdateSpace({ repoId, hfToken, folderPath, publicBaseUrl, masterKey, repoOwner, repoSlug }) {
  const pythonProgram = [
    'import json, os',
    'from huggingface_hub import HfApi',
    'api = HfApi(token=os.environ["HF_TOKEN"])',
    'repo_id = os.environ["HF_REPO_ID"]',
    'api.create_repo(repo_id=repo_id, repo_type="space", space_sdk="docker", exist_ok=True)',
    'api.add_space_secret(repo_id=repo_id, key="SPM_MASTER_KEY", value=os.environ["SPM_MASTER_KEY"])',
    'api.add_space_secret(repo_id=repo_id, key="HUGGINGFACE_TOKEN", value=os.environ["HF_TOKEN"])',
    'api.add_space_variable(repo_id=repo_id, key="SPM_PUBLIC_BASE_URL", value=os.environ["SPM_PUBLIC_BASE_URL"])',
    'api.add_space_variable(repo_id=repo_id, key="SPM_BASE_URL", value=os.environ["SPM_PUBLIC_BASE_URL"])',
    'api.add_space_variable(repo_id=repo_id, key="SPM_MCP_BASE_URL", value=os.environ["SPM_PUBLIC_BASE_URL"])',
    'api.add_space_variable(repo_id=repo_id, key="SPM_SECRET_BACKEND", value="file")',
    'api.add_space_variable(repo_id=repo_id, key="SPM_STATE_DIR", value="/data/spm")',
    'api.add_space_variable(repo_id=repo_id, key="HF_SPACE_OWNER", value=os.environ["HF_SPACE_OWNER"])',
    'api.add_space_variable(repo_id=repo_id, key="HF_SPACE_SLUG", value=os.environ["HF_SPACE_SLUG"])',
    'api.upload_folder(repo_id=repo_id, repo_type="space", folder_path=os.environ["HF_FOLDER_PATH"])',
    'print(json.dumps({"ok": True, "repo_id": repo_id, "public_base_url": os.environ["SPM_PUBLIC_BASE_URL"]}))',
  ].join('\n')

  const { stdout } = await execFileAsync('python3', ['-c', pythonProgram], {
    env: {
      ...process.env,
      HF_TOKEN: hfToken,
      HUGGING_FACE_HUB_TOKEN: hfToken,
      HF_REPO_ID: repoId,
      HF_FOLDER_PATH: folderPath,
      SPM_MASTER_KEY: masterKey,
      SPM_PUBLIC_BASE_URL: publicBaseUrl,
      HF_SPACE_OWNER: repoOwner,
      HF_SPACE_SLUG: repoSlug,
    },
    maxBuffer: 20 * 1024 * 1024,
  })

  return JSON.parse(String(stdout || '{}').trim() || '{}')
}

async function ensurePythonModule(moduleName) {
  await execFileAsync('python3', ['-c', `import ${moduleName}`], { maxBuffer: 10 * 1024 * 1024 })
}

async function loadSecretValue(store, name) {
  const entry = await store.getSecret({ name, reveal: true })
  const value = String(entry?.value || '').trim()
  if (!value) {
    throw new Error(`spm_secret_missing:${name}`)
  }
  return value
}

async function ensureMasterKey(store, secretName) {
  const current = await store.getSecret({ name: secretName, reveal: true }).catch(() => null)
  const value = String(current?.value || '').trim()
  if (value) {
    return value
  }
  const created = crypto.randomBytes(32).toString('base64')
  await store.putSecret({
    name: secretName,
    value: created,
    description: 'HF Space file-backend master key for SIN-Passwordmanager',
    tags: ['huggingface-space', 'spm-master-key'],
  })
  return created
}

function parseArgs(argv) {
  const out = {}
  for (let index = 0; index < argv.length; index += 1) {
    const entry = argv[index]
    if (!entry.startsWith('--')) {
      continue
    }
    const separator = entry.indexOf('=')
    if (separator >= 0) {
      out[entry.slice(2, separator)] = entry.slice(separator + 1)
      continue
    }
    out[entry.slice(2)] = argv[index + 1] || 'true'
    index += 1
  }
  return out
}

async function copyTree(source, target) {
  const stat = await fs.stat(source)
  if (!stat.isDirectory()) {
    throw new Error(`copy_tree_source_not_directory:${source}`)
  }
  await fs.mkdir(target, { recursive: true })
  const entries = await fs.readdir(source, { withFileTypes: true })
  for (const entry of entries) {
    if (shouldSkipEntry(entry.name)) {
      continue
    }
    const sourcePath = path.join(source, entry.name)
    const targetPath = path.join(target, entry.name)
    if (entry.isDirectory()) {
      await copyTree(sourcePath, targetPath)
      continue
    }
    await copyFile(sourcePath, targetPath)
  }
}

async function copyFile(source, target) {
  await fs.mkdir(path.dirname(target), { recursive: true })
  await fs.copyFile(source, target)
}

function shouldSkipEntry(name) {
  return [
    'node_modules',
    '.next',
    'dist',
    'coverage',
    '.turbo',
    '.git',
    '.DS_Store',
  ].includes(name)
}

main().catch((error) => {
  const message = error instanceof Error ? error.stack || error.message : String(error)
  process.stderr.write(`${message}\n`)
  process.exitCode = 1
})
