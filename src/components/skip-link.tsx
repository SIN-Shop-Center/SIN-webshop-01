// Purpose: Skip-Link für A11y (Issue #52)
// Docs: WCAG 2.4.1 Bypass Blocks — erstes fokussierbares Element auf
// jeder Seite, erlaubt Screen-Reader- und Keyboard-Nutzern direkt zum
// Hauptinhalt zu springen.

export function SkipLink() {
  return (
    <a
      href="#main"
      className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-background focus:px-4 focus:py-2 focus:text-foreground focus:outline focus:outline-2"
    >
      Zum Inhalt springen
    </a>
  )
}
