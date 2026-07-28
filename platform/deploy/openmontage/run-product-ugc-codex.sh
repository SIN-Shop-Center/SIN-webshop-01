#!/bin/zsh
set -euo pipefail

PROJECT_ID="${1:?project id required}"
BRIEF_PATH="${2:?brief path required}"
OPENMONTAGE_ROOT="${OPENMONTAGE_ROOT:-/Users/jeremy/dev/OpenMontage}"
SHOPSIN_ROOT="${SHOPSIN_ROOT:-/Users/jeremy/dev/SIN-webshop-01}"
PROJECT_PATH="${OPENMONTAGE_ROOT}/projects/${PROJECT_ID}"
CODEX_BIN="${CODEX_BIN:-$(command -v codex 2>/dev/null || true)}"

[[ -n "$CODEX_BIN" ]] || { echo "codex binary not found" >&2; exit 127; }
[[ -d "$OPENMONTAGE_ROOT" ]] || { echo "OpenMontage root missing: $OPENMONTAGE_ROOT" >&2; exit 66; }
[[ -d "$PROJECT_PATH" ]] || { echo "Project missing: $PROJECT_PATH" >&2; exit 66; }
[[ -f "$BRIEF_PATH" ]] || { echo "Brief missing: $BRIEF_PATH" >&2; exit 66; }

root_real="$(cd "$OPENMONTAGE_ROOT" && pwd -P)"
project_real="$(cd "$PROJECT_PATH" && pwd -P)"
brief_real="$(cd "$(dirname "$BRIEF_PATH")" && pwd -P)/$(basename "$BRIEF_PATH")"

case "$project_real" in
  "$root_real"/projects/*) ;;
  *) echo "Project escaped OpenMontage root" >&2; exit 65 ;;
esac
case "$brief_real" in
  "$project_real"/*) ;;
  *) echo "Brief escaped project workspace" >&2; exit 65 ;;
esac

# Pull pending approval/revision decisions from the web control plane into the
# local checkpoint files before deciding whether Codex should resume.
(
  cd "$SHOPSIN_ROOT"
  /usr/bin/env node tooling/scripts/pipeline/apply-creative-approvals.mjs --project-id "$PROJECT_ID"
)

# Do not spend another model turn while a human checkpoint is still unresolved.
checkpoint_state="$(python3 - "$project_real" <<'PY'
import glob, json, os, sys
project = sys.argv[1]
waiting = []
for path in sorted(glob.glob(os.path.join(project, 'checkpoint_*.json'))):
    try:
        with open(path, 'r', encoding='utf-8') as handle:
            payload = json.load(handle)
    except Exception:
        continue
    decision = (
        payload.get('metadata', {})
        .get('commerce_control_plane_approval', {})
        .get('decision')
    )
    if (
        payload.get('status') == 'awaiting_human'
        and payload.get('human_approved') is not True
        and decision != 'revision_requested'
    ):
        waiting.append(os.path.basename(path))
print(','.join(waiting))
PY
)"

if [[ -n "$checkpoint_state" ]]; then
  echo "OpenMontage is waiting for human approval: $checkpoint_state"
  exit 0
fi

if command -v orca >/dev/null 2>&1 && [[ "${CODEX_ALLOW_NO_ORCA:-0}" != "1" ]]; then
  orca status --json >/dev/null 2>&1 || {
    echo "Orca exists but is not healthy. Set CODEX_ALLOW_NO_ORCA=1 only for a deliberate manual override." >&2
    exit 69
  }
fi

TASK_FILE="${project_real}/CODEX_TASK.md"
cat > "$TASK_FILE" <<EOF
# Codex task: continue OpenMontage product-ugc project

Work only inside this repository and the project workspace below.

- OpenMontage root: ${root_real}
- Project ID: ${PROJECT_ID}
- Project workspace: ${project_real}
- Product brief: ${brief_real}
- Pipeline manifest: ${root_real}/pipeline_defs/product-ugc.yaml

Required behavior:
1. Read AGENT_GUIDE.md, the product-ugc pipeline manifest, all required skills, PROJECT_BRIEF.md, project.json, existing artifacts, decisions, and checkpoints.
2. Resume from the first incomplete stage. Never restart completed stages or overwrite approved artifacts without recording a revision.
3. Preserve exact product identity and every evidence/claim constraint from the commerce intake.
4. Follow every checkpoint. When a stage requires human approval, write the artifacts and checkpoint with status awaiting_human, then stop successfully.
5. Before resuming a checkpoint, inspect metadata.commerce_control_plane_approval:
   - decision=approved means the human accepted the current artifact; record the approval in the decision log, complete the checkpoint according to the checkpoint protocol, and continue.
   - decision=revision_requested means revise that exact stage using the supplied feedback, validate the replacement artifact, write a fresh awaiting_human checkpoint, clear the consumed control-plane decision from the active checkpoint metadata, and stop for another review.
6. Do not perform paid generation before the approved proposal and budget exist.
7. Do not publish to ShopSIN, TikTok, or any social network. OpenMontage only produces reviewed exports and handoff metadata.
8. The final video is not complete unless final_review.status is exactly pass.
9. Keep every generated file inside ${project_real}.
10. Run available validations for every artifact you create or revise.
11. End with a concise machine-readable summary in ${project_real}/codex_last_run.json containing project_id, resumed_stage, completed_stage, waiting_for_human, validation_results, blockers, and next_action.
EOF

cd "$root_real"
export OPENMONTAGE_PROJECT_ID="$PROJECT_ID"
export OPENMONTAGE_PROJECT_PATH="$project_real"

# Non-interactive execution is intentionally scoped to OpenMontage. The agent's
# own pipeline/checkpoint rules remain stricter than Codex's shell permissions.
cat "$TASK_FILE" | "$CODEX_BIN" exec --json --skip-git-repo-check -
