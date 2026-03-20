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
import { PROJECT_GOOGLE_DOC_ID, PROJECT_GOOGLE_DOC_ROOT_TAB_TITLE } from '../config/project-ssot.mjs'
import { loadLocalEnvFiles, readArgValue } from './lib/cli-env.mjs'

const DEFAULT_DOCUMENT_ID = PROJECT_GOOGLE_DOC_ID
const DOCS_SCOPE = 'https://www.googleapis.com/auth/documents'
const DEFAULT_TAB_TITLE = PROJECT_GOOGLE_DOC_ROOT_TAB_TITLE
const INSERT_MARKER = 'SHOP_STOREFRONT_GOVERNANCE_V1'

async function main() {
  loadLocalEnvFiles()

  const args = new Set(process.argv.slice(2))
  const dryRun = args.has('--dry-run')
  const acceptedUtc = readArgValue('--accepted-utc') || new Date().toISOString()
  const documentId = readArgValue('--document-id') || process.env.PROJECT_GOOGLE_DOC_ID || DEFAULT_DOCUMENT_ID
  const tabTitle = readArgValue('--tab-title') || process.env.PROJECT_GOOGLE_DOC_TAB_TITLE || DEFAULT_TAB_TITLE
  const apiBase = String(process.env.GOOGLE_DOCS_API_BASE_URL || DEFAULT_GOOGLE_DOCS_API_BASE).trim().replace(/\/$/, '')
  const block = buildGovernanceBlock(acceptedUtc)

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

  process.stdout.write(`OK: appended storefront governance definitions to tab ${tabTitle} in document ${documentId}\n`)
}

function buildGovernanceBlock(acceptedUtc) {
  return `

Storefront Governance Definitions
${INSERT_MARKER}

<artifact_id>SHOP-STOREFRONT-GOV-001</artifact_id>
<module>SHOP_STOREFRONT</module>
<priority>P0</priority>
<status>ACCEPTED</status>
<accepted_utc>${acceptedUtc}</accepted_utc>

Source Basis
- web.dev: Payment and address form best practices
  https://web.dev/articles/payment-and-address-form-best-practices
- web.dev: Optimize Interaction to Next Paint
  https://web.dev/articles/optimize-inp
- Google Search Central: Product structured data
  https://developers.google.com/search/docs/appearance/structured-data/product
- Google Search Central Blog: Organization-level return policies
  https://developers.google.com/search/blog/2024/06/structured-data-return-policies

critical_invariant
- Jede oeffentliche Commerce-Flaeche muss Kundennutzen, Preis-Kontext, Lieferhinweis und Rueckgabe-/Kontaktpfad vor dem primaeren Kauf-CTA oder im selben sichtbaren Cluster erkennbar machen.
- Jede Commerce-Flaeche besitzt genau einen primaeren CTA. Sekundaere Aktionen sind optional, aber auf maximal eine direkt konkurrierende Aktion zu begrenzen.
- Der primäre Checkout-Pfad besteht nur aus Lieferung, Zahlung und Pruefung. Marketing-Banner, Chat-Unterbrechungen, Side-Quests und nicht notwendige Navigation gehoeren nicht in diesen Kernpfad.
- Optionale Angaben wie Telefon, Firma, USt-IdNr. oder interne Referenzen duerfen den primären Checkout-Pfad nicht blockieren und bleiben standardmaessig eingeklappt, bis der Nutzer sie bewusst oeffnet oder bereits Werte vorhanden sind.
- Checkout- und Formularfelder nutzen bedeutungsvolles HTML mit Label, type, autocomplete und inputmode, sofern dafuer native HTML-Kontrollen existieren.
- Kaufbare Produktseiten muessen genaue Product-/Merchant-Listing-Strukturdaten fuer Preis, Verfuegbarkeit sowie weitere verfuegbare Produktmerkmale im Seitenausgabepfad bereitstellen.
- Site-weite Rueckgaberegeln werden unter Organization/OnlineStore-Markup gepflegt, damit Rueckgabeinformationen zentral verwaltbar, testbar und konsistent bleiben.
- Kern-Commerce-Routen (Home, PLP, PDP, Cart, Checkout) muessen auf Mobil und Desktop auf eine gute Reaktionsfaehigkeit ausgelegt sein; Zielwert fuer INP ist <= 200 ms am p75.

halt_condition
- BLOCKED sobald Platzhalterinhalte, Demo-Bilder, Musterdaten oder unvollstaendige Rechtstexte oeffentlich sichtbar sind.
- BLOCKED sobald sichtbarer Preis, Verfuegbarkeit, Liefer- oder Rueckgabehinweis von Product-Markup, Merchant-Listing-Markup oder Feed-Daten abweicht.
- BLOCKED sobald der primäre Checkout-Pfad mehr als Lieferung, Zahlung und Pruefung enthaelt oder durch Promotions, Chat, Cross-Sell-Zwischenstops oder konkurrierende CTAs unterbrochen wird.
- BLOCKED sobald notwendige Checkout-Felder keine klaren Labels, keine nativen HTML-Semantiken oder keine passenden autocomplete-/inputmode-Hinweise besitzen.
- BLOCKED sobald Product- oder Organization-Markup fehlt, ungueltig ist oder nicht ueber Rich Results Test beziehungsweise Search-Pruefung verifiziert wurde.
- BLOCKED sobald RUM-, CrUX- oder PageSpeed-Signale fuer Kern-Commerce-Routen zeigen, dass INP ueber 200 ms am p75 liegt oder Layout-Thrashing/Langtasks zentrale Interaktionen verzoegern.

evidence_trace
- Screenshots oder Snapshots fuer Home, PLP, PDP, Cart und Checkout.
- Feld- oder Labor-Nachweis fuer INP der Kern-Commerce-Routen.
- Rich-Results- oder Markup-Validierung fuer Product-Markup.
- Rich-Results- oder Markup-Validierung fuer Organization-/Return-Policy-Markup.
- Sichtpruefung: genau ein primaerer CTA pro Commerce-Surface, optionale Felder eingeklappt, keine Platzhalterinhalte oeffentlich.

Definition of Done
- SHOP-STOREFRONT-GOV-001: Governance-Block vorhanden und im Notebook mit citation_count >= 1 querybar.
- SHOP-UX-001: Home, PLP, PDP, Cart und Checkout folgen den Storefront-critical_invariants.
- SHOP-SEO-001: Product- und Organization-Markup fuer Preis, Verfuegbarkeit und Rueckgabe erfolgreich validiert.
- SHOP-PERF-001: Kern-Commerce-Routen belegen einen guten INP-Zustand oder haben einen dokumentierten Remediation-Plan.
- SHOP-LIVE-001: Keine Platzhalter-/Demo-Inhalte auf oeffentlichen Commerce-Seiten.
`
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error)
  process.stderr.write(`ERROR: ${message}\n`)
  process.exitCode = 1
})
