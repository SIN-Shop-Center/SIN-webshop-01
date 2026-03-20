#!/usr/bin/env node

import fs from 'node:fs/promises'
import process from 'node:process'

import {
  PROJECT_GOOGLE_DOC_ID,
  PROJECT_GOOGLE_DOC_ROOT_TAB_TITLE,
  PROJECT_GOOGLE_DOC_TITLE,
  PROJECT_NOTEBOOK_ID,
  PROJECT_NOTEBOOK_SOURCE_ID,
  PROJECT_SSOT_MARKDOWN_FILES,
} from '../config/project-ssot.mjs'
import {
  batchUpdateGoogleDocument,
  fetchGoogleDocument,
  findGoogleDocTabById,
  loadGoogleUserOAuth,
  requestGoogleUserAccessToken,
} from './lib/google-api.mjs'
import { hasFlag, loadLocalEnvFiles, readArgValue } from './lib/cli-env.mjs'

const ROOT_TAB_ID = 't.0'

function flattenTabs(tabs) {
  const out = []
  for (const tab of tabs || []) {
    out.push(tab)
    out.push(...flattenTabs(tab.childTabs || []))
  }
  return out
}

function buildRootTabText(syncedAt) {
  return [
    PROJECT_GOOGLE_DOC_TITLE,
    `Last synced: ${syncedAt}`,
    '',
    'Mirror model:',
    '- Local Markdown files remain canonical project artifacts in the repo.',
    '- This Google Doc mirrors the full canonical Markdown set for collaboration and NotebookLM.',
    '- NotebookLM must remain bound to exactly one Google Doc source for this project.',
    '',
    'Project identity:',
    `- Notebook ID: ${PROJECT_NOTEBOOK_ID}`,
    `- Notebook source ID: ${PROJECT_NOTEBOOK_SOURCE_ID}`,
    '',
    'Canonical child-tab set:',
    ...PROJECT_SSOT_MARKDOWN_FILES.map((entry) => `- ${entry}`),
    '',
    'Notes:',
    '- Each child tab mirrors one canonical markdown file as raw markdown text.',
    '- After updating this Google Doc, sync the NotebookLM Drive source before relying on citations.',
  ].join('\n')
}

function buildMarkdownTabText(relativePath, content, syncedAt) {
  return [
    relativePath,
    `Last synced: ${syncedAt}`,
    '',
    content.trimEnd(),
    '',
  ].join('\n')
}

function replaceTabBodyRequests(tabId, bodyContent, text) {
  const safeContent = Array.isArray(bodyContent) ? bodyContent : []
  const endIndex = Number(safeContent[safeContent.length - 1]?.endIndex || 1)
  const requests = []

  if (endIndex > 2) {
    requests.push({
      deleteContentRange: {
        range: {
          startIndex: 1,
          endIndex: endIndex - 1,
          tabId,
        },
      },
    })
  }

  requests.push({
    insertText: {
      location: { index: 1, tabId },
      text,
    },
  })

  return requests
}

async function main() {
  loadLocalEnvFiles()

  const dryRun = hasFlag('--dry-run')
  const documentId = readArgValue('--document-id') || process.env.PROJECT_GOOGLE_DOC_ID || PROJECT_GOOGLE_DOC_ID
  const oauthFile = readArgValue('--oauth-file') || process.env.GOOGLE_USER_OAUTH_FILE || ''
  const syncedAt = readArgValue('--synced-at') || new Date().toISOString()

  if (dryRun) {
    process.stdout.write(`${JSON.stringify({
      documentId,
      documentTitle: PROJECT_GOOGLE_DOC_TITLE,
      rootTabTitle: PROJECT_GOOGLE_DOC_ROOT_TAB_TITLE,
      notebookId: PROJECT_NOTEBOOK_ID,
      sourceId: PROJECT_NOTEBOOK_SOURCE_ID,
      fileCount: PROJECT_SSOT_MARKDOWN_FILES.length,
      files: PROJECT_SSOT_MARKDOWN_FILES,
    }, null, 2)}\n`)
    return
  }

  const userOAuth = loadGoogleUserOAuth({ filePath: oauthFile })
  const accessToken = await requestGoogleUserAccessToken({ userOAuth })

  let document = await fetchGoogleDocument({ documentId, accessToken, includeTabsContent: true })
  let rootTab = findGoogleDocTabById(document.tabs || [], ROOT_TAB_ID)
  if (!rootTab?.tabProperties) {
    throw new Error(`google_doc_root_tab_not_found:${ROOT_TAB_ID}`)
  }

  const setupRequests = []
  if (String(rootTab.tabProperties.title || '').trim() !== PROJECT_GOOGLE_DOC_ROOT_TAB_TITLE) {
    setupRequests.push({
      updateDocumentTabProperties: {
        tabProperties: { tabId: ROOT_TAB_ID, title: PROJECT_GOOGLE_DOC_ROOT_TAB_TITLE },
        fields: 'title',
      },
    })
  }

  const existingTabs = flattenTabs(document.tabs || [])
  const existingTitles = new Set(existingTabs.map((tab) => String(tab?.tabProperties?.title || '').trim()).filter(Boolean))
  for (const [index, relativePath] of PROJECT_SSOT_MARKDOWN_FILES.entries()) {
    if (!existingTitles.has(relativePath)) {
      setupRequests.push({
        addDocumentTab: {
          tabProperties: {
            title: relativePath,
            parentTabId: ROOT_TAB_ID,
            index,
          },
        },
      })
    }
  }

  if (setupRequests.length > 0) {
    await batchUpdateGoogleDocument({ documentId, accessToken, requests: setupRequests })
    document = await fetchGoogleDocument({ documentId, accessToken, includeTabsContent: true })
    rootTab = findGoogleDocTabById(document.tabs || [], ROOT_TAB_ID)
  }

  const tabsByTitle = new Map(
    flattenTabs(document.tabs || []).map((tab) => [String(tab?.tabProperties?.title || '').trim(), tab]),
  )

  await batchUpdateGoogleDocument({
    documentId,
    accessToken,
    requests: replaceTabBodyRequests(ROOT_TAB_ID, rootTab?.documentTab?.body?.content || [], buildRootTabText(syncedAt)),
  })

  for (const relativePath of PROJECT_SSOT_MARKDOWN_FILES) {
    const tab = tabsByTitle.get(relativePath)
    if (!tab?.tabProperties?.tabId) {
      throw new Error(`google_doc_child_tab_not_found:${relativePath}`)
    }

    const content = await fs.readFile(relativePath, 'utf8')
    const text = buildMarkdownTabText(relativePath, content, syncedAt)
    await batchUpdateGoogleDocument({
      documentId,
      accessToken,
      requests: replaceTabBodyRequests(tab.tabProperties.tabId, tab?.documentTab?.body?.content || [], text),
    })
  }

  process.stdout.write(`OK: synced ${PROJECT_SSOT_MARKDOWN_FILES.length} markdown files into ${documentId}\n`)
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error)
  process.stderr.write(`ERROR: ${message}\n`)
  process.exitCode = 1
})
