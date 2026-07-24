// Purpose: TypeScript declarations for Plausible custom events (Issue #58)

export {}

declare global {
  interface Window {
    plausible?: (
      event: string,
      opts?: { props?: Record<string, string | number> },
    ) => void
  }
}
