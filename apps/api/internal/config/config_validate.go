package config

import (
	"fmt"
	"net/url"
	"strings"
)

func (c Config) ValidateAPI() error {
	problems := []string{}

	if strings.TrimSpace(c.DatabaseURL) == "" {
		problems = append(problems, "DATABASE_URL is required")
	}
	if len(c.CORSAllowlist) == 0 {
		problems = append(problems, "CORS_ALLOWLIST must contain at least one origin")
	}
	for _, origin := range c.CORSAllowlist {
		parsed, err := url.Parse(origin)
		if err != nil || parsed.Scheme == "" || parsed.Host == "" {
			problems = append(problems, fmt.Sprintf("invalid CORS origin %q", origin))
			continue
		}
		if c.Environment == "production" {
			host := strings.ToLower(parsed.Hostname())
			if host == "localhost" || host == "127.0.0.1" || host == "::1" {
				problems = append(problems, fmt.Sprintf("localhost origin not allowed in production: %q", origin))
			}
		}
	}
	if c.Environment == "production" && strings.TrimSpace(c.SiteURL) != "" {
		siteParsed, err := url.Parse(c.SiteURL)
		if err == nil && siteParsed.Scheme != "" && siteParsed.Host != "" {
			siteOrigin := siteParsed.Scheme + "://" + siteParsed.Host
			found := false
			for _, origin := range c.CORSAllowlist {
				if strings.EqualFold(strings.TrimSpace(origin), siteOrigin) {
					found = true
					break
				}
			}
			if !found {
				problems = append(problems, "CORS_ALLOWLIST must include the SITE_URL origin in production")
			}
		}
	}

	if c.JWTRequired {
		if strings.TrimSpace(c.SupabaseJWKSURL) == "" {
			problems = append(problems, "SUPABASE_JWKS_URL is required when JWT_REQUIRED=true")
		}
		if strings.TrimSpace(c.SupabaseIssuer) == "" {
			problems = append(problems, "SUPABASE_ISSUER is required when JWT_REQUIRED=true")
		}
		if strings.TrimSpace(c.SupabaseAudience) == "" {
			problems = append(problems, "SUPABASE_AUDIENCE is required when JWT_REQUIRED=true")
		}
	}

	if c.Environment == "production" {
		required := map[string]string{
			"STRIPE_SECRET_KEY":       c.StripeSecretKey,
			"STRIPE_WEBHOOK_SECRET":   c.StripeWebhookKey,
			"SITE_URL":                c.SiteURL,
			"SUPPLIER_WEBHOOK_SECRET": c.SupplierWebhookSecret,
		}
		appendMissing(&problems, required)
		if strings.TrimSpace(c.SiteURL) != "" {
			parsed, err := url.Parse(c.SiteURL)
			if err != nil || parsed.Scheme == "" || parsed.Host == "" {
				problems = append(problems, "SITE_URL must be a valid URL in production")
			} else {
				host := strings.ToLower(parsed.Hostname())
				if host == "localhost" || host == "127.0.0.1" || host == "::1" {
					problems = append(problems, "SITE_URL must not point to localhost in production")
				}
			}
		}
	}
	appendOptionalR2Problems(&problems, c)
	appendOptionalModalProblems(&problems, c)

	return validateProblems("API", problems)
}

func (c Config) ValidateWorker() error {
	problems := []string{}
	if strings.TrimSpace(c.DatabaseURL) == "" {
		problems = append(problems, "DATABASE_URL is required")
	}
	if c.Environment == "production" {
		if strings.TrimSpace(c.GoogleServiceAccountJSONB64) == "" && strings.TrimSpace(c.GoogleServiceAccountFile) == "" {
			problems = append(problems, "GOOGLE_SERVICE_ACCOUNT_JSON_B64 or GOOGLE_SERVICE_ACCOUNT_FILE is required")
		}
		required := map[string]string{
			"GMAIL_DELEGATED_USER": c.GmailDelegatedUser,
			"GMAIL_SENDER_FROM":    c.GmailSenderFrom,
			"BILLING_COMPANY_NAME": c.BillingCompanyName,
			"BILLING_ADDRESS":      c.BillingAddress,
			"BILLING_TAX_ID":       c.BillingTaxID,
			"BILLING_VAT_ID":       c.BillingVATID,
		}
		appendMissing(&problems, required)
		if strings.TrimSpace(c.GmailAPIBaseURL) == "" {
			problems = append(problems, "GMAIL_API_BASE_URL must be set")
		} else if parsed, err := url.Parse(c.GmailAPIBaseURL); err != nil || parsed.Scheme == "" || parsed.Host == "" {
			problems = append(problems, "GMAIL_API_BASE_URL must be a valid URL")
		}
	}
	appendOptionalR2Problems(&problems, c)
	appendOptionalModalProblems(&problems, c)
	return validateProblems("worker", problems)
}

func appendOptionalR2Problems(problems *[]string, c Config) {
	values := []string{
		strings.TrimSpace(c.R2AccountID),
		strings.TrimSpace(c.R2AccessKeyID),
		strings.TrimSpace(c.R2SecretAccessKey),
		strings.TrimSpace(c.R2Bucket),
	}
	setCount := 0
	for _, value := range values {
		if value != "" {
			setCount++
		}
	}
	if setCount == 0 {
		return
	}
	if strings.TrimSpace(c.R2AccountID) == "" {
		*problems = append(*problems, "R2_ACCOUNT_ID is required when R2 is configured")
	}
	if strings.TrimSpace(c.R2AccessKeyID) == "" {
		*problems = append(*problems, "R2_ACCESS_KEY_ID is required when R2 is configured")
	}
	if strings.TrimSpace(c.R2SecretAccessKey) == "" {
		*problems = append(*problems, "R2_SECRET_ACCESS_KEY is required when R2 is configured")
	}
	if strings.TrimSpace(c.R2Bucket) == "" {
		*problems = append(*problems, "R2_BUCKET is required when R2 is configured")
	}
}

func appendOptionalModalProblems(problems *[]string, c Config) {
	values := []string{
		strings.TrimSpace(c.ModalAPIToken),
		strings.TrimSpace(c.ModalRenderURL),
		strings.TrimSpace(c.ModalStatusURL),
	}
	setCount := 0
	for _, value := range values {
		if value != "" {
			setCount++
		}
	}
	if setCount == 0 {
		return
	}
	if strings.TrimSpace(c.ModalRenderURL) == "" {
		*problems = append(*problems, "MODAL_RENDER_URL is required when Modal is configured")
	}
	for key, raw := range map[string]string{
		"MODAL_RENDER_URL": c.ModalRenderURL,
		"MODAL_STATUS_URL": c.ModalStatusURL,
	} {
		if strings.TrimSpace(raw) == "" {
			continue
		}
		if parsed, err := url.Parse(raw); err != nil || parsed.Scheme == "" || parsed.Host == "" {
			*problems = append(*problems, fmt.Sprintf("%s must be a valid URL", key))
		}
	}
	if c.ModalPollIntervalMS < 1000 {
		*problems = append(*problems, "MODAL_POLL_INTERVAL_MS must be at least 1000")
	}
	if c.ModalRequestTimeoutSeconds < 30 {
		*problems = append(*problems, "MODAL_REQUEST_TIMEOUT_SECONDS must be at least 30")
	}
	if c.ModalMaxVariantsPerRun < 1 {
		*problems = append(*problems, "MODAL_MAX_VARIANTS_PER_RUN must be at least 1")
	}
}

func appendMissing(problems *[]string, required map[string]string) {
	for key, value := range required {
		if strings.TrimSpace(value) == "" {
			*problems = append(*problems, fmt.Sprintf("%s is required", key))
		}
	}
}

func validateProblems(scope string, problems []string) error {
	if len(problems) == 0 {
		return nil
	}
	return fmt.Errorf("invalid %s configuration: %s", scope, strings.Join(problems, "; "))
}
