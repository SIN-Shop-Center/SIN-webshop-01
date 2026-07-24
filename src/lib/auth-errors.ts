// Purpose: Map Supabase auth error messages to German user-facing text
// Docs: PLAN-VERKAUFSFAEHIG.md (Step 10 — i18n consistency)

const ERROR_MAP: Array<[match: string, german: string]> = [
  ['Invalid login credentials', 'E-Mail oder Passwort ist falsch.'],
  ['Email not confirmed', 'Bitte bestätige zuerst deine E-Mail-Adresse.'],
  ['User already registered', 'Diese E-Mail-Adresse ist bereits registriert.'],
  ['Password should be at least', 'Das Passwort muss mindestens 8 Zeichen lang sein.'],
  ['rate limit', 'Zu viele Versuche. Bitte warte einen Moment.'],
  ['Email rate limit exceeded', 'Zu viele Versuche. Bitte warte einen Moment.'],
  ['Unable to validate email', 'Bitte gib eine gültige E-Mail-Adresse ein.'],
  ['network', 'Netzwerkfehler. Bitte prüfe deine Internetverbindung.'],
]

export function translateAuthError(message: string): string {
  const lower = message.toLowerCase()
  for (const [match, german] of ERROR_MAP) {
    if (lower.includes(match.toLowerCase())) return german
  }
  return 'Es ist ein Fehler aufgetreten. Bitte versuche es erneut.'
}
