import type { ApprovalCreativeCheckpoint } from '@/lib/actions/approvals/types'
import { AssetsPreview } from './assets-preview'
import { GenericPreview, ReviewBox } from './preview-common'
import { ProposalPreview } from './proposal-preview'
import { ScenePreview, ScriptPreview } from './script-scene-previews'
import { StatusPill } from './approval-ui'

export function CheckpointArtifactPreview({
  checkpoint,
}: {
  checkpoint: ApprovalCreativeCheckpoint
}) {
  const preview = checkpoint.artifactPreview

  return (
    <div className="mt-5 space-y-4">
      {!preview ? (
        <p className="rounded-lg border border-dashed border-border p-4 text-xs text-muted-foreground">
          Für diesen Checkpoint wurde noch keine lesbare Artefaktvorschau synchronisiert.
        </p>
      ) : checkpoint.stage === 'proposal' ? (
        <ProposalPreview preview={preview} />
      ) : checkpoint.stage === 'script' ? (
        <ScriptPreview preview={preview} />
      ) : checkpoint.stage === 'scene_plan' ? (
        <ScenePreview preview={preview} />
      ) : checkpoint.stage === 'assets' ? (
        <AssetsPreview preview={preview} />
      ) : (
        <GenericPreview preview={preview} />
      )}

      {checkpoint.costSnapshot ? (
        <ReviewBox title="Kostenstand" value={checkpoint.costSnapshot} />
      ) : null}
      {checkpoint.review ? (
        <ReviewBox title="OpenMontage Review" value={checkpoint.review} />
      ) : null}
      {checkpoint.finalReview ? (
        <div className={`rounded-lg border p-4 ${
          checkpoint.finalReview.status === 'pass'
            ? 'border-success/20 bg-success/5'
            : 'border-accent/20 bg-accent/5'
        }`}>
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs font-semibold">Final Review</p>
            <StatusPill value={checkpoint.finalReview.status || 'offen'} />
          </div>
          {checkpoint.finalReview.summary ? (
            <p className="mt-2 text-xs leading-5 text-muted-foreground">
              {checkpoint.finalReview.summary}
            </p>
          ) : null}
          {checkpoint.finalReview.blockers.length ? (
            <ul className="mt-2 space-y-1 text-xs text-destructive">
              {checkpoint.finalReview.blockers.map((blocker) => <li key={blocker}>{blocker}</li>)}
            </ul>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
