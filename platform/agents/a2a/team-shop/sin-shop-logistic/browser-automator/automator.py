#!/usr/bin/env python3
"""Fail-closed browser workflow planner for sin-shop-logistic."""

from __future__ import annotations

import argparse
import json
from datetime import datetime, timezone
from pathlib import Path

ALLOWED_FLOWS = {
    "supplier-registration",
    "product-integration",
    "tiktok-draft-sync",
}
HUMAN_GATES = ["login", "captcha", "payment", "publication", "legal-confirmation"]


def build_audit(flow: str, inputs: dict[str, object]) -> dict[str, object]:
    if flow not in ALLOWED_FLOWS:
        raise ValueError(f"unsupported flow: {flow}")
    return {
        "agent_id": "sin-shop-logistic",
        "flow": flow,
        "mode": "dry-run",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "inputs": inputs,
        "human_gates": HUMAN_GATES,
        "irreversible_actions_executed": [],
        "screenshot_checkpoints": ["provider-entry", "validated-form", "pre-submit"],
        "status": "awaiting-human-approval",
    }


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--flow", required=True, choices=sorted(ALLOWED_FLOWS))
    parser.add_argument("--inputs-json", default="{}")
    parser.add_argument("--artifact-dir", default=".artifacts/sin-shop-logistic")
    parser.add_argument("--execute", action="store_true")
    args = parser.parse_args()
    if args.execute:
        parser.error(
            "external execution is disabled; use the operator-approved browser workflow"
        )

    inputs = json.loads(args.inputs_json)
    if not isinstance(inputs, dict):
        parser.error("--inputs-json must contain a JSON object")
    audit = build_audit(args.flow, inputs)
    artifact_dir = Path(args.artifact_dir)
    artifact_dir.mkdir(parents=True, exist_ok=True)
    (artifact_dir / "audit.json").write_text(
        json.dumps(audit, indent=2), encoding="utf-8"
    )
    (artifact_dir / "screenshot-manifest.json").write_text(
        json.dumps(
            {"capture_on": audit["screenshot_checkpoints"], "captured": []}, indent=2
        ),
        encoding="utf-8",
    )
    print(json.dumps(audit))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
