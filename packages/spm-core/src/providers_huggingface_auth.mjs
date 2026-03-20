import { spawn } from 'node:child_process'

const SIN_AUTHENTICATOR_BIN = process.env.SIN_AUTHENTICATOR_BIN || '/Users/jeremy/dev/SIN-Solver/bin/sin-authenticator'

export async function syncHuggingFaceSpaceSecretViaSinAuthenticator({ repoId, secretName, secretValue }) {
  const payload = JSON.stringify({
    action: 'huggingface.space.secret.set',
    repoId,
    key: secretName,
    value: secretValue,
  })

  return new Promise((resolve, reject) => {
    const child = spawn(SIN_AUTHENTICATOR_BIN, ['run-action', payload], {
      stdio: ['ignore', 'pipe', 'pipe'],
      env: {
        ...process.env,
        AUTHD_ENABLE_HUGGINGFACE_SPACE_WRITE: '1',
      },
    })

    let stdout = ''
    let stderr = ''
    let settled = false

    const finishSuccess = () => {
      if (settled) {
        return
      }
      settled = true
      child.kill('SIGTERM')
      resolve({
        provider: 'huggingface',
        repoId,
        secretName,
        via: 'sin-authenticator',
      })
    }

    const finishError = (message) => {
      if (settled) {
        return
      }
      settled = true
      child.kill('SIGTERM')
      reject(new Error(String(message || 'huggingface_space_secret_failed').trim()))
    }

    const inspectStdout = () => {
      const match = stdout.match(/\{[\s\S]*\}/)
      if (!match) {
        return
      }
      try {
        const parsed = JSON.parse(match[0])
        if (parsed?.ok === true) {
          finishSuccess()
          return
        }
        if (parsed?.error) {
          finishError(parsed.error)
        }
      } catch {
        // keep waiting for complete JSON payload
      }
    }

    const timer = setTimeout(() => {
      inspectStdout()
      if (!settled) {
        finishError(stderr || stdout || 'huggingface_space_secret_failed:timeout')
      }
    }, 20000)

    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString()
      inspectStdout()
    })
    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString()
    })
    child.on('error', (error) => {
      clearTimeout(timer)
      finishError(error.message)
    })
    child.on('close', (code) => {
      clearTimeout(timer)
      inspectStdout()
      if (!settled && code === 0) {
        finishSuccess()
        return
      }
      if (!settled) {
        finishError(stderr || stdout || `huggingface_space_secret_failed:${code}`)
      }
    })
  })
}
