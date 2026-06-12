// Purpose: Sanitize CJ HTML descriptions (XSS-safe, strip layout junk)
// Docs: AGENTS.md — used in cj-sync for description_html column

export function sanitizeProductDescription(rawHtml: string): string {
  if (!rawHtml) return ''

  let clean = rawHtml
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<iframe[^>]*>[\s\S]*?<\/iframe>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/ on\w+="[^"]*"/gi, '')
    .replace(/ on\w+='[^']*'/gi, '')
    .replace(/<h1[^>]*>/gi, '<h3>')
    .replace(/<\/h1>/gi, '</h3>')

  const allowed = new Set([
    'p', 'br', 'ul', 'ol', 'li', 'strong', 'b', 'em', 'i',
    'h2', 'h3', 'h4', 'table', 'thead', 'tbody', 'tr', 'td', 'th', 'img',
  ])

  clean = clean.replace(/<(\/?)(\w+)[^>]*>/gi, (match, slash, tag) => {
    const lower = tag.toLowerCase()
    if (allowed.has(lower)) return match
    return ''
  })

  clean = clean.replace(/<img[^>]*src="(https:\/\/[^"]+)"[^>]*>/gi, (match) => {
    if (match.includes('src="https://')) return match
    return ''
  })

  return clean
}
