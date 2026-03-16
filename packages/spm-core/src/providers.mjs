import { execFile } from 'node:child_process'
import { promisify } from 'node:util'

const execFileAsync = promisify(execFile)

export async function syncSecretToTarget({ config, target, secretName, secretValue, authValue }) {
  switch (target.kind) {
    case 'github_actions_repo':
      return syncGithubRepoSecret({ config, target, secretName, secretValue, authValue })
    case 'cloudflare_worker_secret':
      return syncCloudflareWorkerSecret({ config, target, secretName, secretValue, authValue })
    case 'vercel_project_env':
      return syncVercelProjectEnv({ config, target, secretName, secretValue, authValue })
    case 'huggingface_space_secret':
      return syncHuggingFaceSpaceSecret({ target, secretName, secretValue, authValue })
    default:
      throw new Error(`target_kind_unsupported:${target.kind}`)
  }
}

async function syncGithubRepoSecret({ config, target, secretName, secretValue, authValue }) {
  const owner = String(target.params?.owner || '').trim()
  const repo = String(target.params?.repo || '').trim()
  if (!owner || !repo) {
    throw new Error('github_repo_target_incomplete')
  }
  const targetSecretName = String(target.params?.secretName || secretName).trim()
  await execFileAsync(
    'gh',
    [
      'secret',
      'set',
      targetSecretName,
      '--repo',
      `${owner}/${repo}`,
      '--body',
      secretValue,
    ],
    {
      env: {
        ...process.env,
        GH_TOKEN: authValue,
        GITHUB_TOKEN: authValue,
      },
      maxBuffer: 10 * 1024 * 1024,
    },
  )

  return {
    provider: 'github',
    owner,
    repo,
    secretName: targetSecretName,
  }
}

async function syncCloudflareWorkerSecret({ config, target, secretName, secretValue, authValue }) {
  const accountId = String(target.params?.accountId || '').trim()
  const scriptName = String(target.params?.scriptName || '').trim()
  if (!accountId || !scriptName) {
    throw new Error('cloudflare_worker_target_incomplete')
  }

  const targetSecretName = String(target.params?.secretName || secretName).trim()
  const response = await fetch(
    `${config.cloudflareApiBase}/accounts/${encodeURIComponent(accountId)}/workers/scripts/${encodeURIComponent(scriptName)}/secrets`,
    {
      method: 'PUT',
      headers: {
        authorization: `Bearer ${authValue}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        name: targetSecretName,
        text: secretValue,
        type: 'secret_text',
      }),
    },
  )
  const payload = await response.json().catch(() => ({}))
  if (!response.ok || payload?.success === false) {
    const message = payload?.errors?.[0]?.message || payload?.message
    throw new Error(String(message || `cloudflare_worker_secret_failed:${response.status}`).trim())
  }

  return {
    provider: 'cloudflare',
    accountId,
    scriptName,
    secretName: targetSecretName,
  }
}

async function syncVercelProjectEnv({ config, target, secretName, secretValue, authValue }) {
  const projectId = String(target.params?.projectId || target.params?.projectName || '').trim()
  if (!projectId) {
    throw new Error('vercel_project_target_incomplete')
  }

  const targetSecretName = String(target.params?.secretName || secretName).trim()
  const targets = Array.isArray(target.params?.targets) && target.params.targets.length > 0
    ? target.params.targets
    : ['production']

  const search = new URLSearchParams()
  if (String(target.params?.upsert ?? 'true').trim()) {
    search.set('upsert', String(target.params?.upsert ?? 'true').trim())
  }
  if (String(target.params?.teamId || '').trim()) {
    search.set('teamId', String(target.params.teamId).trim())
  }

  const response = await fetch(
    `${config.vercelApiBase}/v10/projects/${encodeURIComponent(projectId)}/env${search.toString() ? `?${search.toString()}` : ''}`,
    {
      method: 'POST',
      headers: {
        authorization: `Bearer ${authValue}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        key: targetSecretName,
        value: secretValue,
        type: 'encrypted',
        target: targets,
        gitBranch: target.params?.gitBranch || undefined,
      }),
    },
  )
  const payload = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(String(payload?.error?.message || payload?.message || `vercel_env_upsert_failed:${response.status}`).trim())
  }

  return {
    provider: 'vercel',
    projectId,
    secretName: targetSecretName,
    targets,
  }
}

async function syncHuggingFaceSpaceSecret({ target, secretName, secretValue, authValue }) {
  const repoId = String(target.params?.repoId || '').trim()
  if (!repoId) {
    throw new Error('huggingface_space_target_incomplete')
  }

  const targetSecretName = String(target.params?.secretName || secretName).trim()
  const pythonProgram = [
    'import json, os, sys',
    'try:',
    '    from huggingface_hub import HfApi',
    'except Exception as error:',
    "    raise SystemExit(f'huggingface_hub_missing:{error}')",
    "api = HfApi(token=os.environ['SPM_HF_TOKEN'])",
    "api.add_space_secret(",
    "    repo_id=os.environ['SPM_HF_SPACE_REPO_ID'],",
    "    key=os.environ['SPM_HF_SPACE_SECRET_KEY'],",
    "    value=os.environ['SPM_HF_SPACE_SECRET_VALUE'],",
    ')',
    "print(json.dumps({",
    "    'provider': 'huggingface',",
    "    'repoId': os.environ['SPM_HF_SPACE_REPO_ID'],",
    "    'secretName': os.environ['SPM_HF_SPACE_SECRET_KEY'],",
    "}))",
  ].join('\n')

  const { stdout, stderr } = await execFileAsync(
    'python3',
    ['-c', pythonProgram],
    {
      env: {
        ...process.env,
        HF_TOKEN: authValue,
        HUGGING_FACE_HUB_TOKEN: authValue,
        SPM_HF_TOKEN: authValue,
        SPM_HF_SPACE_REPO_ID: repoId,
        SPM_HF_SPACE_SECRET_KEY: targetSecretName,
        SPM_HF_SPACE_SECRET_VALUE: secretValue,
      },
      maxBuffer: 10 * 1024 * 1024,
    },
  ).catch((error) => {
    const stderrText = String(error?.stderr || '').trim()
    const stdoutText = String(error?.stdout || '').trim()
    const message = stderrText || stdoutText || error.message || 'huggingface_space_secret_failed'
    throw new Error(String(message).trim())
  })

  const payload = JSON.parse(String(stdout || '{}').trim() || '{}')
  if (String(stderr || '').trim()) {
    throw new Error(String(stderr).trim())
  }

  return {
    provider: 'huggingface',
    repoId,
    secretName: targetSecretName,
    ...payload,
  }
}
