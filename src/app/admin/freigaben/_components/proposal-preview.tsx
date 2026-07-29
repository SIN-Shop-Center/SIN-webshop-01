import { ReviewBox } from './preview-common'
import { previewRecord, previewRows, previewText } from './preview-utils'
import { StatusPill } from './approval-ui'

export function ProposalPreview({ preview }: { preview: Record<string, unknown> }) {
  const concepts = previewRows(preview.concept_options)
  const plan = previewRecord(preview.production_plan)
  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-2">
        {concepts.map((concept, index) => (
          <article key={previewText(concept.id, String(index))} className="rounded-lg border border-border bg-background p-4">
            <div className="flex items-start justify-between gap-3">
              <h5 className="text-sm font-semibold">{previewText(concept.title, `Konzept ${index + 1}`)}</h5>
              {preview.selected_concept === concept.id ? <StatusPill value="ausgewählt" /> : null}
            </div>
            <p className="mt-2 text-xs leading-5 text-muted-foreground">
              <strong className="text-foreground">Hook:</strong> {previewText(concept.hook)}
            </p>
            <p className="mt-2 text-xs leading-5 text-muted-foreground">
              {previewText(concept.visual_approach || concept.narrative_structure)}
            </p>
            {concept.target_duration_seconds ? (
              <p className="mt-2 text-[11px] text-muted-foreground">
                Ziel: {previewText(concept.target_duration_seconds)} Sekunden
              </p>
            ) : null}
          </article>
        ))}
      </div>
      {plan ? (
        <div className="rounded-lg border border-border bg-background p-4">
          <p className="text-xs font-semibold">Produktionsplan</p>
          <dl className="mt-3 grid gap-3 text-xs sm:grid-cols-3">
            <div><dt className="text-muted-foreground">Qualität</dt><dd className="mt-1 font-medium">{previewText(plan.quality_tier)}</dd></div>
            <div><dt className="text-muted-foreground">Runtime</dt><dd className="mt-1 font-medium">{previewText(plan.render_runtime)}</dd></div>
            <div><dt className="text-muted-foreground">Komposition</dt><dd className="mt-1 font-medium">{previewText(plan.composition_mode)}</dd></div>
          </dl>
          {plan.art_direction ? <p className="mt-3 text-xs leading-5 text-muted-foreground">{previewText(plan.art_direction)}</p> : null}
        </div>
      ) : null}
      {preview.cost_estimate ? <ReviewBox title="Kostenschätzung" value={preview.cost_estimate} /> : null}
    </div>
  )
}
