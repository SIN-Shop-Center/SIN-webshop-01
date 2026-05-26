package worker

import (
	"context"
	"fmt"
	"strings"
	"time"
)

type supplierRegistrationTarget struct {
	ID              string
	Name            string
	APIEndpoint     string
	RegistrationURL string
	PortalURL       string
	Website         string
}

func supportsSupplierRegistrationAPI(endpoint string) bool {
	return false
}

func (p *Processor) handleSupplierRegistrationRequested(ctx context.Context, job Job) error {
	payload, err := payloadMap(job.Payload)
	if err != nil {
		return fmt.Errorf("%w: invalid supplier registration payload", ErrPermanent)
	}

	runID := normalizeUUID(asString(payload["run_id"]))
	supplierID := normalizeUUID(asString(payload["supplier_id"]))
	if runID == "" || supplierID == "" {
		return fmt.Errorf("%w: supplier_registration_run_or_supplier_missing", ErrPermanent)
	}

	executionMode := strings.ToLower(strings.TrimSpace(asString(payload["execution_mode"])))
	if executionMode == "" {
		executionMode = "hybrid"
	}
	dryRun, _ := payload["dry_run"].(bool)

	target, err := p.loadSupplierRegistrationTarget(ctx, supplierID)
	if err != nil {
		return err
	}
	if target == nil {
		return fmt.Errorf("%w: supplier_not_found", ErrPermanent)
	}

	if err := p.markOnboardingRunRunning(ctx, runID); err != nil {
		return err
	}

	hasAPIEndpoint := strings.TrimSpace(target.APIEndpoint) != ""
	canUseAPI := (executionMode == "api" || executionMode == "hybrid") && hasAPIEndpoint && supportsSupplierRegistrationAPI(target.APIEndpoint)

	if executionMode == "api" && !canUseAPI {
		errorMessage := "api_registration_not_supported"
		if !hasAPIEndpoint {
			errorMessage = "api_path_unavailable"
		}

		resultPayload := map[string]any{
			"path":                     "api",
			"dry_run":                  dryRun,
			"endpoint":                 target.APIEndpoint,
			"adapter_available":        canUseAPI,
			"requested_execution_mode": "api",
			"resolved_execution_mode":  "browser",
		}
		if err := p.upsertOnboardingStep(ctx, runID, supplierID, 10, "supplier_api_registration", "failed", resultPayload, nil, errorMessage); err != nil {
			return err
		}
		if err := p.appendOnboardingActivity(ctx, supplierID, runID, "onboarding.api_registration.unavailable", "warning", "API registration unavailable; switching to browser flow", resultPayload); err != nil {
			return err
		}
		if _, err := p.pool.Exec(ctx, `
update shop.supplier_onboarding_runs
set execution_mode = 'browser',
    updated_at = now()
where id::text = $1
  and execution_mode = 'api'
`, runID); err != nil {
			return err
		}
		executionMode = "browser"
	}

	artifactURLs := make([]string, 0, 2)
	if url := strings.TrimSpace(target.RegistrationURL); url != "" {
		artifactURLs = append(artifactURLs, url)
	}
	if url := strings.TrimSpace(target.PortalURL); url != "" {
		if len(artifactURLs) == 0 || artifactURLs[0] != url {
			artifactURLs = append(artifactURLs, url)
		}
	}
	if len(artifactURLs) == 0 {
		if url := pickRegistrationURL(target); url != "" {
			artifactURLs = append(artifactURLs, url)
		}
	}

	artifactPayload := map[string]any{
		"run_id":                     runID,
		"supplier_id":                supplierID,
		"execution_mode":             executionMode,
		"dry_run":                    dryRun,
		"registration_url":           pickRegistrationURL(target),
		"api_endpoint":               target.APIEndpoint,
		"api_registration_supported": canUseAPI,
		"callback_path":              "/api/v1/admin/suppliers/onboarding/callback",
		"requested_at":               time.Now().UTC().Format(time.RFC3339),
	}
	if err := p.upsertOnboardingStep(ctx, runID, supplierID, 20, "supplier_browser_registration", "running", artifactPayload, artifactURLs, ""); err != nil {
		return err
	}
	if err := p.appendOnboardingActivity(ctx, supplierID, runID, "onboarding.browser_fallback.requested", "warning", "Browser fallback requested via automation bridge", artifactPayload); err != nil {
		return err
	}

	if err := p.postAutomationEvent(ctx, "supplier.registration.browser.requested", artifactPayload); err != nil {
		return err
	}
	return p.postAutomationEvent(ctx, job.JobType, payload)
}
