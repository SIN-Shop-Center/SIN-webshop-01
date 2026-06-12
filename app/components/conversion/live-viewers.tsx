// Purpose: Show real viewer count (requires analytics backend — currently hidden)
// Docs: AGENTS.md
// SECURITY: No fake numbers — would violate EU Omnibus directive.
// This component is a placeholder for real analytics integration.

export function LiveViewers(_props: { productId: string }) {
  // TODO: Connect to real pageview analytics (e.g. Turso/Redis counter)
  // Right now we return null to avoid fake social proof (irreführende geschäftliche Handlung)
  return null
}
