import { previewRows, previewText } from './preview-utils'

export function ScriptPreview({ preview }: { preview: Record<string, unknown> }) {
  const sections = previewRows(preview.sections)
  return (
    <div className="rounded-lg border border-border bg-background p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-semibold">Script</p>
        <span className="text-xs text-muted-foreground">{previewText(preview.total_duration_seconds)} Sek.</span>
      </div>
      <div className="mt-3 space-y-3">
        {sections.map((section, index) => (
          <div key={previewText(section.id, String(index))} className="border-l-2 border-border pl-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              {previewText(section.label, `Teil ${index + 1}`)} · {previewText(section.start_seconds)}–{previewText(section.end_seconds)}s
            </p>
            <p className="mt-1 text-sm leading-6">{previewText(section.text)}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

export function ScenePreview({ preview }: { preview: Record<string, unknown> }) {
  const scenes = previewRows(preview.scenes)
  return (
    <div className="space-y-2">
      {scenes.map((scene, index) => (
        <details key={previewText(scene.id, String(index))} className="rounded-lg border border-border bg-background p-4">
          <summary className="cursor-pointer list-none text-sm font-semibold">
            Szene {index + 1}: {previewText(scene.description, previewText(scene.semantic_purpose))}
          </summary>
          <dl className="mt-3 grid gap-3 text-xs sm:grid-cols-2">
            <div><dt className="text-muted-foreground">Zeit</dt><dd className="mt-1">{previewText(scene.start_seconds)}–{previewText(scene.end_seconds)}s</dd></div>
            <div><dt className="text-muted-foreground">Motion</dt><dd className="mt-1">{previewText(scene.motion_class)}</dd></div>
            <div className="sm:col-span-2"><dt className="text-muted-foreground">Aktion</dt><dd className="mt-1 leading-5">{previewText(scene.visual_action)}</dd></div>
            {scene.spoken_phrase ? <div className="sm:col-span-2"><dt className="text-muted-foreground">Gesprochen</dt><dd className="mt-1 leading-5">{previewText(scene.spoken_phrase)}</dd></div> : null}
          </dl>
        </details>
      ))}
    </div>
  )
}
