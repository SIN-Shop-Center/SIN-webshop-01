export function normalizeNextPath(candidate: string | null): string {
  if (!candidate || !candidate.startsWith('/')) {
    return '/kundencenter'
  }
  if (candidate.startsWith('//')) {
    return '/kundencenter'
  }
  if (candidate.startsWith('/login') || candidate.startsWith('/kundencenter/login')) {
    return '/kundencenter'
  }
  return candidate
}
