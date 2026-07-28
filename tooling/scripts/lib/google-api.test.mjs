import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

import {
  DEFAULT_GOOGLE_TOKEN_URI,
  findGoogleDocTabById,
  findGoogleDocTabByTitle,
  flattenGoogleDocElements,
  getGoogleDocInsertIndex,
  hasGoogleServiceAccount,
  loadGoogleUserOAuth,
  loadGoogleServiceAccount,
  normalizeGoogleServiceAccount,
  requestGoogleUserAccessToken,
} from './google-api.mjs'

test('normalizeGoogleServiceAccount applies defaults and preserves project id', () => {
  const result = normalizeGoogleServiceAccount({
    client_email: 'demo@example.com',
    private_key: 'secret',
    project_id: 'demo-project',
  })

  assert.equal(result.clientEmail, 'demo@example.com')
  assert.equal(result.privateKey, 'secret')
  assert.equal(result.tokenURI, DEFAULT_GOOGLE_TOKEN_URI)
  assert.equal(result.projectId, 'demo-project')
})

test('loadGoogleServiceAccount accepts base64 input', () => {
  const encoded = Buffer.from(JSON.stringify({
    client_email: 'encoded@example.com',
    private_key: 'private',
    token_uri: 'https://oauth.example/token',
  }), 'utf8').toString('base64')

  const result = loadGoogleServiceAccount({
    encoded,
    filePath: '',
    fallbackFilePath: '',
  })

  assert.equal(result.clientEmail, 'encoded@example.com')
  assert.equal(result.privateKey, 'private')
  assert.equal(result.tokenURI, 'https://oauth.example/token')
})

test('loadGoogleServiceAccount accepts file input and hasGoogleServiceAccount detects it', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'google-api-'))
  const filePath = path.join(dir, 'credentials.json')
  await fs.writeFile(filePath, JSON.stringify({
    client_email: 'file@example.com',
    private_key: 'private-key',
    token_uri: 'https://oauth2.googleapis.com/token',
  }), 'utf8')

  assert.equal(hasGoogleServiceAccount({ encoded: '', filePath, fallbackFilePath: '' }), true)

  const result = loadGoogleServiceAccount({
    encoded: '',
    filePath,
    fallbackFilePath: '',
  })

  assert.equal(result.clientEmail, 'file@example.com')
  assert.equal(result.privateKey, 'private-key')
})

test('hasGoogleServiceAccount returns false when no encoded or file path exists', () => {
  assert.equal(hasGoogleServiceAccount({
    encoded: '',
    filePath: '/tmp/does-not-exist-google-api.json',
    fallbackFilePath: '',
  }), false)
})

test('loadGoogleUserOAuth accepts file input', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'google-user-oauth-'))
  const filePath = path.join(dir, 'user-oauth.json')
  await fs.writeFile(filePath, JSON.stringify({
    client_id: 'client-id',
    client_secret: 'client-secret',
    refresh_token: 'refresh-token',
    token_uri: 'https://oauth.example/token',
    access_token: 'cached-token',
    expiry_date: Date.now() + 3600_000,
    scope: 'scope-a scope-b',
  }), 'utf8')

  const result = loadGoogleUserOAuth({ filePath, fallbackFilePath: '' })

  assert.equal(result.clientId, 'client-id')
  assert.equal(result.clientSecret, 'client-secret')
  assert.equal(result.refreshToken, 'refresh-token')
  assert.equal(result.tokenURI, 'https://oauth.example/token')
  assert.equal(result.accessToken, 'cached-token')
})

test('requestGoogleUserAccessToken refreshes and persists access tokens', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'google-user-oauth-refresh-'))
  const filePath = path.join(dir, 'user-oauth.json')
  await fs.writeFile(filePath, JSON.stringify({
    client_id: 'client-id',
    client_secret: 'client-secret',
    refresh_token: 'refresh-token',
    token_uri: 'https://oauth.example/token',
    access_token: 'expired-token',
    expiry_date: 1,
    scope: 'scope-a',
  }), 'utf8')

  const originalFetch = globalThis.fetch
  globalThis.fetch = async () => ({
    ok: true,
    json: async () => ({
      access_token: 'fresh-token',
      expires_in: 1800,
      scope: 'scope-a scope-b',
    }),
  })

  try {
    const userOAuth = loadGoogleUserOAuth({ filePath, fallbackFilePath: '' })
    const accessToken = await requestGoogleUserAccessToken({ userOAuth, persistFilePath: filePath })
    const persisted = JSON.parse(await fs.readFile(filePath, 'utf8'))

    assert.equal(accessToken, 'fresh-token')
    assert.equal(persisted.access_token, 'fresh-token')
    assert.equal(persisted.scope, 'scope-a scope-b')
    assert.ok(Number(persisted.expiry_date) > Date.now())
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('flattenGoogleDocElements flattens paragraphs, tables, and table of contents', () => {
  const flattened = flattenGoogleDocElements([
    {
      paragraph: {
        elements: [
          { textRun: { content: 'Hello' } },
          { textRun: { content: '\u000bWorld' } },
        ],
      },
    },
    {
      table: {
        tableRows: [
          {
            tableCells: [
              {
                content: [
                  {
                    paragraph: {
                      elements: [{ textRun: { content: 'TableCell' } }],
                    },
                  },
                ],
              },
            ],
          },
        ],
      },
    },
    {
      tableOfContents: {
        content: [
          {
            paragraph: {
              elements: [{ textRun: { content: 'TocEntry' } }],
            },
          },
        ],
      },
    },
  ])

  assert.equal(flattened, 'Hello\nWorldTableCellTocEntry')
})

test('findGoogleDocTabByTitle and findGoogleDocTabById search nested tabs', () => {
  const tabs = [
    {
      tabProperties: { title: 'Parent', tabId: 'parent' },
      childTabs: [
        {
          tabProperties: { title: 'Child', tabId: 'child' },
          childTabs: [
            {
              tabProperties: { title: 'Grandchild', tabId: 'grandchild' },
            },
          ],
        },
      ],
    },
  ]

  assert.equal(findGoogleDocTabByTitle(tabs, 'Grandchild')?.tabProperties?.tabId, 'grandchild')
  assert.equal(findGoogleDocTabById(tabs, 'child')?.tabProperties?.title, 'Child')
  assert.equal(findGoogleDocTabByTitle(tabs, 'Missing'), null)
})

test('getGoogleDocInsertIndex uses final endIndex and falls back to 1', () => {
  assert.equal(getGoogleDocInsertIndex([{ endIndex: 10 }]), 9)
  assert.equal(getGoogleDocInsertIndex([]), 1)
  assert.equal(getGoogleDocInsertIndex(null), 1)
})
