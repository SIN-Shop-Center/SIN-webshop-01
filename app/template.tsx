// Purpose: Root template — adds a subtle fade-in on every route change
// Docs: AGENTS.md

export default function RootTemplate({ children }: { children: React.ReactNode }) {
  return <div className="fade-in">{children}</div>
}
