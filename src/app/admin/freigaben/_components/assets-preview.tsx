import { previewRows, previewText } from './preview-utils'

export function AssetsPreview({ preview }: { preview: Record<string, unknown> }) {
  const assets = previewRows(preview.assets)
  return (
    <div className="rounded-lg border border-border bg-background p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-semibold">Assetpaket ({assets.length})</p>
        <span className="text-xs font-semibold tabular-nums">${Number(preview.total_cost_usd || 0).toFixed(2)}</span>
      </div>
      <div className="mt-3 divide-y divide-border">
        {assets.slice(0, 24).map((asset, index) => (
          <div key={previewText(asset.id, String(index))} className="flex items-start justify-between gap-3 py-3 text-xs">
            <div className="min-w-0">
              <p className="truncate font-medium">{previewText(asset.id, `Asset ${index + 1}`)}</p>
              <p className="mt-1 truncate text-muted-foreground">{previewText(asset.type)} · {previewText(asset.provider || asset.source_tool)}</p>
            </div>
            <span className="shrink-0 tabular-nums text-muted-foreground">${Number(asset.cost_usd || 0).toFixed(2)}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
