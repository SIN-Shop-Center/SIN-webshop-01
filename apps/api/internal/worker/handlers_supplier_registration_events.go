package worker

import (
	"context"
	"fmt"
	"strings"
)

func (p *Processor) handleSupplierRegistrationStepCompleted(ctx context.Context, job Job) error {
	payload, err := payloadMap(job.Payload)
	if err != nil {
		return fmt.Errorf("%w: invalid supplier step payload", ErrPermanent)
	}

	runID := normalizeUUID(asString(payload["run_id"]))
	supplierID := normalizeUUID(asString(payload["supplier_id"]))
	if runID == "" || supplierID == "" {
		return fmt.Errorf("%w: supplier_step_run_or_supplier_missing", ErrPermanent)
	}

	stepType := defaultText(asString(payload["step_type"]), "supplier_step")
	stepStatus := strings.ToLower(defaultText(asString(payload["step_status"]), "succeeded"))
	stepOrder := 30
	if numeric, ok := payload["step_order"].(float64); ok {
		stepOrder = int(numeric)
	}
	output := asMap(payload["output_payload"])
	artifactURLs := toStringSlice(payload["artifact_urls"])
	errorMessage := asString(payload["error_message"])

	if err := p.upsertOnboardingStep(ctx, runID, supplierID, stepOrder, stepType, stepStatus, output, artifactURLs, errorMessage); err != nil {
		return err
	}
	return p.postAutomationEvent(ctx, job.JobType, payload)
}

func (p *Processor) handleSupplierRegistrationCompleted(ctx context.Context, job Job) error {
	payload, err := payloadMap(job.Payload)
	if err != nil {
		return fmt.Errorf("%w: invalid supplier registration completion payload", ErrPermanent)
	}
	runID := normalizeUUID(asString(payload["run_id"]))
	supplierID := normalizeUUID(asString(payload["supplier_id"]))
	if runID == "" || supplierID == "" {
		return fmt.Errorf("%w: supplier_completion_run_or_supplier_missing", ErrPermanent)
	}

	if err := p.markOnboardingRunFinished(ctx, runID, supplierID, "succeeded", asMap(payload["result_payload"]), ""); err != nil {
		return err
	}
	return p.postAutomationEvent(ctx, job.JobType, payload)
}

func (p *Processor) handleSupplierRegistrationFailed(ctx context.Context, job Job) error {
	payload, err := payloadMap(job.Payload)
	if err != nil {
		return fmt.Errorf("%w: invalid supplier registration failed payload", ErrPermanent)
	}
	runID := normalizeUUID(asString(payload["run_id"]))
	supplierID := normalizeUUID(asString(payload["supplier_id"]))
	if runID == "" || supplierID == "" {
		return fmt.Errorf("%w: supplier_failed_run_or_supplier_missing", ErrPermanent)
	}

	errorMessage := defaultText(asString(payload["error"]), "supplier_registration_failed")
	if err := p.markOnboardingRunFinished(ctx, runID, supplierID, "failed", asMap(payload["result_payload"]), errorMessage); err != nil {
		return err
	}
	return p.postAutomationEvent(ctx, job.JobType, payload)
}
