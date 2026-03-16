#!/usr/bin/env node

import process from 'node:process'
import {
  DEFAULT_GOOGLE_DOCS_API_BASE,
  batchUpdateGoogleDocument,
  fetchGoogleDocument,
  findGoogleDocTabByTitle,
  flattenGoogleDocElements,
  getGoogleDocInsertIndex,
  loadGoogleServiceAccount,
  requestGoogleAccessToken,
} from './lib/google-api.mjs'
import { loadLocalEnvFiles, readArgValue } from './lib/cli-env.mjs'

const DEFAULT_DOCUMENT_ID = '1CWNvxXU7aXgO2rCA_RzCkTILuO34_e09vwCWISoOijQ'
const DOCS_SCOPE = 'https://www.googleapis.com/auth/documents'
const DEFAULT_TAB_TITLE = 'DESIGN.md'
const INSERT_MARKER = 'BROWSER_WORKFLOW_GOVERNANCE_DEFINITIONS_V2'
const LEGACY_INSERT_MARKERS = ['BROWSER_WORKFLOW_GOVERNANCE_DEFINITIONS_V1']

async function main() {
  loadLocalEnvFiles()

  const args = new Set(process.argv.slice(2))
  const dryRun = args.has('--dry-run')
  const documentId = readArgValue('--document-id') || process.env.PROJECT_GOOGLE_DOC_ID || DEFAULT_DOCUMENT_ID
  const tabTitle = readArgValue('--tab-title') || process.env.PROJECT_GOOGLE_DOC_TAB_TITLE || DEFAULT_TAB_TITLE
  const apiBase = String(process.env.GOOGLE_DOCS_API_BASE_URL || DEFAULT_GOOGLE_DOCS_API_BASE).trim().replace(/\/$/, '')
  const block = buildGovernanceBlock()

  if (dryRun) {
    process.stdout.write(block)
    return
  }

  const serviceAccount = loadGoogleServiceAccount({
    filePath: readArgValue('--service-account') || process.env.GOOGLE_SERVICE_ACCOUNT_FILE,
  })
  const accessToken = await requestGoogleAccessToken({ serviceAccount, scopes: [DOCS_SCOPE] })
  const document = await fetchGoogleDocument({ apiBase, documentId, accessToken, includeTabsContent: true })
  const targetTab = findGoogleDocTabByTitle(document.tabs || [], tabTitle)
  if (!targetTab?.documentTab?.body?.content) {
    throw new Error(`google_doc_tab_not_found:${tabTitle}`)
  }
  const currentText = flattenGoogleDocElements(targetTab.documentTab.body.content)

  if (currentText.includes(INSERT_MARKER)) {
    process.stdout.write(`NOOP: marker ${INSERT_MARKER} already present in tab ${tabTitle} for document ${documentId}\n`)
    return
  }
  const legacyMarker = LEGACY_INSERT_MARKERS.find((marker) => currentText.includes(marker))
  if (legacyMarker) {
    throw new Error(`legacy_browser_governance_marker_present:${legacyMarker}`)
  }

  const insertIndex = getGoogleDocInsertIndex(targetTab.documentTab.body.content)
  await batchUpdateGoogleDocument({
    apiBase,
    documentId,
    accessToken,
    requests: [
      {
        insertText: {
          location: {
            index: insertIndex,
            tabId: targetTab.tabProperties.tabId,
          },
          text: block,
        },
      },
    ],
  })

  process.stdout.write(`OK: appended browser governance definitions to tab ${tabTitle} in document ${documentId}\n`)
}

function buildGovernanceBlock() {
  return `

Browser Workflow Governance Definitions
${INSERT_MARKER}

Terminology Mapping
- <interaction_invariant>: Die feste Verhaltensregel eines Browser-Workflows. Sie definiert Ziel, stabile Nutzerzustaende, erlaubte Sequenzen und unveraenderliche Pflichten des Flows.
- <security_gate>: Die aktuell im Notebook erwartete Sicherheits- und Begrenzungsdefinition eines Browser-Workflows. Sie definiert erlaubte Domains, Entry-URLs, Session-Quellen, Aktionsklassen und klare Out-of-Scope-Flaechen.
- <execution_boundary>: Die betriebliche Begrenzung eines Browser-Workflows. Sie definiert erlaubte Domains, Entry-URLs, Session-Quellen, Aktionsklassen und klare Out-of-Scope-Flaechen.
- <halt_condition>: Die verbindlichen Stop-Bedingungen eines Browser-Workflows. Sie definieren, bei welchen unerwarteten Zustaenden, fehlenden Markern oder unklaren Uebergaengen der Flow sofort endet.
- <evidence_trace>: Das minimale Nachweis-Paket eines Browser-Runs. Es definiert, welche Screenshots, URL-Zustaende, Marker und Logs fuer eine spaetere deterministische Pruefung vorhanden sein muessen.

Normative Definition Pattern

<interaction_invariant>
- Goal:
- Stable user-visible states:
- Allowed action sequence:
- Non-negotiable stop points:

<security_gate>
- Allowed domains:
- Allowed entry URLs:
- Allowed stored-session sources:
- Allowed action classes:
- Out-of-scope surfaces:

<execution_boundary>
- Allowed domains:
- Allowed entry URLs:
- Allowed stored-session sources:
- Allowed action classes:
- Out-of-scope surfaces:

<halt_condition>
- Hard stop events:
- Ambiguous-state events:
- Missing-evidence events:
- Recovery policy:

<evidence_trace>
- Required screenshots:
- Required state markers:
- Required logs:
- Required final outcome proof:

Canonical Browser Workflow Rule Set

1. interaction_invariant
Jeder Browser-Workflow muss vor Ausfuehrung ein einzelnes klares Ziel besitzen. Der Flow darf nur auf sichtbare Nutzerzustaende reagieren, die zu diesem Ziel gehoeren. Reihenfolge, Uebergaenge und Pflichtaktionen duerfen nicht heuristisch erweitert werden, wenn der aktuelle Zustand nicht mehr eindeutig zum Ziel passt.

2. security_gate
Jeder Browser-Workflow ist auf seine freigegebenen Domains, Entry-Pfade, Session-Quellen und Aktionsklassen begrenzt. Sobald ein Flow ausserhalb dieser Begrenzung landet, gilt der Workflow als verlassen und muss beendet werden.

3. execution_boundary
Der Begriff <execution_boundary> ist die projektspezifische Ersatzbezeichnung fuer dieselbe betriebliche Begrenzung wie <security_gate>. Solange NotebookLM noch den Legacy-Begriff erwartet, muessen beide Begriffe gemeinsam gepflegt und semantisch gleich gehalten werden.

4. halt_condition
Ein Browser-Workflow endet sofort bei Redirects ausserhalb der erlaubten Domains, fehlenden Pflichtmarkern, unklaren Formularzustaenden, nicht aufloesbaren Dialogen, nicht belegbaren Session-Wechseln oder jedem Zustand, in dem das Ziel nicht mehr mit klarer Evidenz verfolgt werden kann.

5. evidence_trace
Jeder Browser-Workflow muss mindestens Start-URL, relevante Zwischen-URL, End-URL, zentrale Statusmarker, wesentliche Aktionsschritte und einen finalen Ergebnisnachweis festhalten. Wenn dieser Nachweis nicht erzeugt werden kann, gilt der Lauf als unvollstaendig und darf nicht als erfolgreich markiert werden.
`
}

main().catch((error) => {
  console.error(`BLOCKED: ${error instanceof Error ? error.message : String(error)}`)
  process.exit(1)
})
