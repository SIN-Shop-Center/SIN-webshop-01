import { requestGoogleServiceAccountAccessToken } from './service-account'

export type GoogleDocumentReadResult = {
  documentId: string
  title: string
  text: string
  checklist: string[]
}

type GoogleDocParagraphElement = {
  textRun?: {
    content?: string
  }
}

type GoogleDocParagraph = {
  elements?: GoogleDocParagraphElement[]
}

type GoogleDocTableCell = {
  content?: GoogleDocStructuralElement[]
}

type GoogleDocTableRow = {
  tableCells?: GoogleDocTableCell[]
}

type GoogleDocTable = {
  tableRows?: GoogleDocTableRow[]
}

type GoogleDocTableOfContents = {
  content?: GoogleDocStructuralElement[]
}

type GoogleDocStructuralElement = {
  paragraph?: GoogleDocParagraph
  table?: GoogleDocTable
  tableOfContents?: GoogleDocTableOfContents
}

type GoogleDocResponse = {
  title?: string
  body?: {
    content?: GoogleDocStructuralElement[]
  }
}

const GOOGLE_DOCS_SCOPE = 'https://www.googleapis.com/auth/documents.readonly'

export function parseGoogleDocumentId(input: string): string {
  const trimmed = input.trim()
  if (!trimmed) {
    return ''
  }
  const match = trimmed.match(/\/document\/d\/([a-zA-Z0-9_-]+)/)
  if (match?.[1]) {
    return match[1]
  }
  return /^[a-zA-Z0-9_-]{20,}$/.test(trimmed) ? trimmed : ''
}

export async function readGoogleDocument(input: string): Promise<GoogleDocumentReadResult> {
  const documentId = parseGoogleDocumentId(input)
  if (!documentId) {
    throw new Error('google_document_id_invalid')
  }

  const { accessToken } = await requestGoogleServiceAccountAccessToken([GOOGLE_DOCS_SCOPE])
  const apiBase = String(process.env.GOOGLE_DOCS_API_BASE_URL || 'https://docs.googleapis.com').trim().replace(/\/$/, '')
  const response = await fetch(`${apiBase}/v1/documents/${encodeURIComponent(documentId)}`, {
    cache: 'no-store',
    headers: {
      authorization: `Bearer ${accessToken}`,
      accept: 'application/json',
    },
  })
  const payload = (await response.json().catch(() => ({}))) as GoogleDocResponse & { error?: { message?: string } }
  if (!response.ok) {
    throw new Error(String(payload.error?.message || `google_document_read_failed:${response.status}`).trim())
  }

  const text = flattenStructuralElements(payload.body?.content || [])
    .replace(/\n{3,}/g, '\n\n')
    .trim()

  return {
    documentId,
    title: String(payload.title || '').trim(),
    text,
    checklist: extractChecklist(text),
  }
}

function flattenStructuralElements(elements: GoogleDocStructuralElement[]): string {
  const out: string[] = []

  for (const element of elements) {
    if (element.paragraph?.elements?.length) {
      const paragraph = element.paragraph.elements
        .map((entry) => String(entry.textRun?.content || ''))
        .join('')
        .replace(/\u000b/g, '\n')
      out.push(paragraph)
      continue
    }

    if (element.table?.tableRows?.length) {
      for (const row of element.table.tableRows) {
        for (const cell of row.tableCells || []) {
          out.push(flattenStructuralElements(cell.content || []))
        }
      }
      continue
    }

    if (element.tableOfContents?.content?.length) {
      out.push(flattenStructuralElements(element.tableOfContents.content))
    }
  }

  return out.join('')
}

function extractChecklist(text: string): string[] {
  const out: string[] = []
  for (const rawLine of text.split('\n')) {
    const line = rawLine.replace(/\s+/g, ' ').trim()
    if (!line) {
      continue
    }
    if (/^(\d+[\].)]|[-*•]|☐|☑)\s+/.test(line) || /^(todo|schritt|step|next|wichtig)\b/i.test(line)) {
      const normalized = line.replace(/^(\d+[\].)]|[-*•]|☐|☑)\s+/, '').trim()
      if (normalized && !out.includes(normalized)) {
        out.push(normalized)
      }
    }
    if (out.length >= 10) {
      break
    }
  }
  return out
}
