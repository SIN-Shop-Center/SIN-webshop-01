import { previewText } from './preview-utils'

export function GenericPreview({ preview }: { preview: Record<string, unknown> }) {
  return (
    <dl className="grid gap-3 rounded-lg border border-border bg-background p-4 text-xs sm:grid-cols-2">
      {Object.entries(preview).slice(0, 16).map(([key, value]) => (
        <div key={key} className="min-w-0">
          <dt className="font-medium text-muted-foreground">{key.replaceAll('_', ' ')}</dt>
          <dd className="mt-1 break-words leading-5">{previewText(value)}</dd>
        </div>
      ))}
    </dl>
  )
}

export function ReviewBox({ title, value }: { title: string; value: unknown }) {
  return (
    <details className="rounded-lg border border-border bg-background p-4">
      <summary className="cursor-pointer list-none text-xs font-semibold">{title}</summary>
      <pre className="mt-3 max-h-72 overflow-auto whitespace-pre-wrap break-words font-mono text-[11px] leading-5 text-muted-foreground">
        {JSON.stringify(value, null, 2)}
      </pre>
    </details>
  )
}
