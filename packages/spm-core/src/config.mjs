import os from 'node:os'
import path from 'node:path'

export function getSPMConfig() {
  const stateDir = path.resolve(
    String(process.env.SPM_STATE_DIR || path.join(os.homedir(), '.simone-spm')).trim(),
  )
  const backend = String(
    process.env.SPM_SECRET_BACKEND || (process.platform === 'darwin' ? 'keychain' : 'file'),
  )
    .trim()
    .toLowerCase()

  return {
    backend,
    stateDir,
    catalogFile: path.join(stateDir, 'catalog.json'),
    fileVault: path.join(stateDir, 'vault.enc.json'),
    serviceName: String(process.env.SPM_KEYCHAIN_SERVICE || 'simone.spm').trim(),
    masterKey: String(process.env.SPM_MASTER_KEY || '').trim(),
    githubApiBase: String(process.env.SPM_GITHUB_API_BASE || 'https://api.github.com').trim().replace(/\/$/, ''),
    cloudflareApiBase: String(process.env.SPM_CLOUDFLARE_API_BASE || 'https://api.cloudflare.com/client/v4').trim().replace(/\/$/, ''),
    vercelApiBase: String(process.env.SPM_VERCEL_API_BASE || 'https://api.vercel.com').trim().replace(/\/$/, ''),
  }
}
