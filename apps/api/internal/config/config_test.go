package config

import (
	"strings"
	"testing"
)

func TestValidateAPIRequiresJWTFieldsWhenJWTRequired(t *testing.T) {
	cfg := Config{
		Environment:      "production",
		DatabaseURL:      "postgres://example",
		CORSAllowlist:    []string{"https://shop.example.com"},
		JWTRequired:      true,
		SupabaseJWKSURL:  "",
		SupabaseIssuer:   "",
		SupabaseAudience: "",
		StripeSecretKey:  "sk_test_123",
		StripeWebhookKey: "whsec_123",
		SiteURL:          "https://shop.example.com",
	}

	if err := cfg.ValidateAPI(); err == nil {
		t.Fatalf("expected validation error when jwt fields are missing")
	}
}

func TestValidateAPIPassesWithCompleteProductionConfig(t *testing.T) {
	cfg := Config{
		Environment:           "production",
		DatabaseURL:           "postgres://example",
		CORSAllowlist:         []string{"https://shop.example.com"},
		JWTRequired:           true,
		SupabaseJWKSURL:       "https://project.supabase.co/auth/v1/.well-known/jwks.json",
		SupabaseIssuer:        "https://project.supabase.co/auth/v1",
		SupabaseAudience:      "authenticated",
		StripeSecretKey:       "sk_live_123",
		StripeWebhookKey:      "whsec_live_123",
		SiteURL:               "https://shop.example.com",
		SupplierWebhookSecret: "supplier_secret_live",
	}

	if err := cfg.ValidateAPI(); err != nil {
		t.Fatalf("unexpected validation error: %v", err)
	}
}

func TestValidateAPIRejectsLocalhostSiteURLInProduction(t *testing.T) {
	cfg := Config{
		Environment:           "production",
		DatabaseURL:           "postgres://example",
		CORSAllowlist:         []string{"https://shop.example.com"},
		JWTRequired:           true,
		SupabaseJWKSURL:       "https://project.supabase.co/auth/v1/.well-known/jwks.json",
		SupabaseIssuer:        "https://project.supabase.co/auth/v1",
		SupabaseAudience:      "authenticated",
		StripeSecretKey:       "sk_live_123",
		StripeWebhookKey:      "whsec_live_123",
		SiteURL:               "http://localhost:3000",
		SupplierWebhookSecret: "supplier_secret_live",
	}

	err := cfg.ValidateAPI()
	if err == nil {
		t.Fatalf("expected validation error for localhost site url")
	}
	if !strings.Contains(err.Error(), "SITE_URL must not point to localhost in production") {
		t.Fatalf("expected localhost site url error, got %v", err)
	}
}

func TestValidateAPIRejectsLoopbackCORSOriginInProduction(t *testing.T) {
	cfg := Config{
		Environment:           "production",
		DatabaseURL:           "postgres://example",
		CORSAllowlist:         []string{"http://127.0.0.1:3000"},
		JWTRequired:           true,
		SupabaseJWKSURL:       "https://project.supabase.co/auth/v1/.well-known/jwks.json",
		SupabaseIssuer:        "https://project.supabase.co/auth/v1",
		SupabaseAudience:      "authenticated",
		StripeSecretKey:       "sk_live_123",
		StripeWebhookKey:      "whsec_live_123",
		SiteURL:               "https://shop.example.com",
		SupplierWebhookSecret: "supplier_secret_live",
	}

	err := cfg.ValidateAPI()
	if err == nil {
		t.Fatalf("expected validation error for loopback cors origin")
	}
	if !strings.Contains(err.Error(), `localhost origin not allowed in production: "http://127.0.0.1:3000"`) {
		t.Fatalf("expected loopback cors origin error, got %v", err)
	}
}

func TestValidateAPIRequiresSiteOriginInCORSAllowlistInProduction(t *testing.T) {
	cfg := Config{
		Environment:           "production",
		DatabaseURL:           "postgres://example",
		CORSAllowlist:         []string{"https://api.example.com"},
		JWTRequired:           true,
		SupabaseJWKSURL:       "https://project.supabase.co/auth/v1/.well-known/jwks.json",
		SupabaseIssuer:        "https://project.supabase.co/auth/v1",
		SupabaseAudience:      "authenticated",
		StripeSecretKey:       "sk_live_123",
		StripeWebhookKey:      "whsec_live_123",
		SiteURL:               "https://shop.example.com",
		SupplierWebhookSecret: "supplier_secret_live",
	}

	err := cfg.ValidateAPI()
	if err == nil {
		t.Fatalf("expected validation error for missing site origin in cors allowlist")
	}
	if !strings.Contains(err.Error(), "CORS_ALLOWLIST must include the SITE_URL origin in production") {
		t.Fatalf("expected missing site origin cors error, got %v", err)
	}
}

func TestValidateAPIRejectsInvalidSiteURLInProduction(t *testing.T) {
	cfg := Config{
		Environment:           "production",
		DatabaseURL:           "postgres://example",
		CORSAllowlist:         []string{"https://shop.example.com"},
		JWTRequired:           true,
		SupabaseJWKSURL:       "https://project.supabase.co/auth/v1/.well-known/jwks.json",
		SupabaseIssuer:        "https://project.supabase.co/auth/v1",
		SupabaseAudience:      "authenticated",
		StripeSecretKey:       "sk_live_123",
		StripeWebhookKey:      "whsec_live_123",
		SiteURL:               "not-a-url",
		SupplierWebhookSecret: "supplier_secret_live",
	}

	err := cfg.ValidateAPI()
	if err == nil {
		t.Fatalf("expected validation error for invalid site url")
	}
	if !strings.Contains(err.Error(), "SITE_URL must be a valid URL in production") {
		t.Fatalf("expected invalid site url error, got %v", err)
	}
}

func TestValidateWorkerRequiresGmailConfigurationInProduction(t *testing.T) {
	cfg := Config{
		Environment: "production",
		DatabaseURL: "postgres://example",
	}

	if err := cfg.ValidateWorker(); err == nil {
		t.Fatalf("expected validation error when gmail worker fields are missing")
	}
}

func TestValidateWorkerPassesWithCompleteProductionConfig(t *testing.T) {
	cfg := Config{
		Environment:                 "production",
		DatabaseURL:                 "postgres://example",
		GoogleServiceAccountJSONB64: "eyJmb28iOiJiYXIifQ==",
		GmailDelegatedUser:          "info@um-24.de",
		GmailSenderFrom:             "Simone Shop <info@um-24.de>",
		GmailAPIBaseURL:             "https://gmail.googleapis.com",
		BillingCompanyName:          "Simone Shop",
		BillingAddress:              "Musterstrasse 1, 10115 Berlin",
		BillingTaxID:                "12/345/67890",
		BillingVATID:                "DE123456789",
	}

	if err := cfg.ValidateWorker(); err != nil {
		t.Fatalf("unexpected worker validation error: %v", err)
	}
}
