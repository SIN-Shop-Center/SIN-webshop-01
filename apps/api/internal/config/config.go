package config

import (
	"os"
	"strconv"
	"strings"
)

type Config struct {
	Environment      string
	Port             string
	DatabaseURL      string
	CORSAllowlist    []string
	SupabaseJWKSURL  string
	SupabaseIssuer   string
	SupabaseAudience string
	JWTRequired      bool
	StripeSecretKey  string
	StripeWebhookKey string
	SiteURL          string

	GoogleServiceAccountJSONB64 string
	GoogleServiceAccountFile    string
	GmailDelegatedUser          string
	GmailSenderFrom             string
	GmailAPIBaseURL             string

	BillingCompanyName string
	BillingAddress     string
	BillingTaxID       string
	BillingVATID       string
	InvoiceOutputDir   string

	N8NWebhookURL            string
	N8NSharedSecret          string
	SupplierWebhookSecret    string
	TikTokBrowserRunnerToken string

	CJAPIKey  string
	CJOpenID  string

	OpenCodeAPIKey string
	OpenCodeModel  string
	OpenCodeURL    string

	NVIDIAAPIKey                string
	NVIDIAReasonURL             string
	NVIDIAPredictURL            string
	NVIDIATransferURL           string
	NVIDIAMaxLiveVariantsPerRun int
	NVIDIAMinRequestIntervalMS  int
	ModalAPIToken               string
	ModalRenderURL              string
	ModalStatusURL              string
	ModalPollIntervalMS         int
	ModalRequestTimeoutSeconds  int
	ModalMaxVariantsPerRun      int

	R2AccountID         string
	R2AccessKeyID       string
	R2SecretAccessKey   string
	R2Bucket            string
	R2PresignTTLSeconds int
}

func Load() Config {
	loadLocalEnvFiles()

	environment := strings.ToLower(get("APP_ENV", get("NODE_ENV", "development")))
	jwtRequired := get("JWT_REQUIRED", "true") != "false"
	if environment == "production" {
		jwtRequired = true
	}

	corsAllowlist := strings.TrimSpace(os.Getenv("CORS_ALLOWLIST"))
	if corsAllowlist == "" && environment != "production" {
		corsAllowlist = "http://localhost:3000,http://localhost:53001"
	}

	supabaseBaseURL := strings.TrimSuffix(strings.TrimSpace(os.Getenv("SUPABASE_URL")), "/")
	supabaseJWKSURL := strings.TrimSpace(os.Getenv("SUPABASE_JWKS_URL"))
	if supabaseJWKSURL == "" && supabaseBaseURL != "" {
		supabaseJWKSURL = supabaseBaseURL + "/auth/v1/.well-known/jwks.json"
	}
	supabaseIssuer := strings.TrimSpace(os.Getenv("SUPABASE_ISSUER"))
	if supabaseIssuer == "" && supabaseBaseURL != "" {
		supabaseIssuer = supabaseBaseURL + "/auth/v1"
	}
	supabaseAudience := strings.TrimSpace(os.Getenv("SUPABASE_AUDIENCE"))
	if supabaseAudience == "" {
		supabaseAudience = "authenticated"
	}

	return Config{
		Environment:      environment,
		Port:             get("PORT", "8080"),
		DatabaseURL:      get("DATABASE_URL", ""),
		CORSAllowlist:    sanitizeAllowlist(splitCSV(corsAllowlist)),
		SupabaseJWKSURL:  supabaseJWKSURL,
		SupabaseIssuer:   supabaseIssuer,
		SupabaseAudience: supabaseAudience,
		JWTRequired:      jwtRequired,
		StripeSecretKey:  strings.TrimSpace(os.Getenv("STRIPE_SECRET_KEY")),
		StripeWebhookKey: strings.TrimSpace(os.Getenv("STRIPE_WEBHOOK_SECRET")),
		SiteURL:          strings.TrimSuffix(strings.TrimSpace(os.Getenv("SITE_URL")), "/"),

		GoogleServiceAccountJSONB64: strings.TrimSpace(os.Getenv("GOOGLE_SERVICE_ACCOUNT_JSON_B64")),
		GoogleServiceAccountFile:    strings.TrimSpace(os.Getenv("GOOGLE_SERVICE_ACCOUNT_FILE")),
		GmailDelegatedUser:          strings.TrimSpace(os.Getenv("GMAIL_DELEGATED_USER")),
		GmailSenderFrom:             strings.TrimSpace(os.Getenv("GMAIL_SENDER_FROM")),
		GmailAPIBaseURL:             strings.TrimSuffix(strings.TrimSpace(get("GMAIL_API_BASE_URL", "https://gmail.googleapis.com")), "/"),

		BillingCompanyName: strings.TrimSpace(os.Getenv("BILLING_COMPANY_NAME")),
		BillingAddress:     strings.TrimSpace(os.Getenv("BILLING_ADDRESS")),
		BillingTaxID:       strings.TrimSpace(os.Getenv("BILLING_TAX_ID")),
		BillingVATID:       strings.TrimSpace(os.Getenv("BILLING_VAT_ID")),
		InvoiceOutputDir:   strings.TrimSpace(get("INVOICE_OUTPUT_DIR", "/tmp/simone-invoices")),

		N8NWebhookURL:            strings.TrimSpace(os.Getenv("N8N_WEBHOOK_URL")),
		N8NSharedSecret:          strings.TrimSpace(os.Getenv("N8N_SHARED_SECRET")),
		SupplierWebhookSecret:    strings.TrimSpace(os.Getenv("SUPPLIER_WEBHOOK_SECRET")),
		TikTokBrowserRunnerToken: strings.TrimSpace(os.Getenv("TIKTOK_BROWSER_RUNNER_TOKEN")),

		CJAPIKey: strings.TrimSpace(os.Getenv("CJ_API_KEY")),
		CJOpenID: strings.TrimSpace(os.Getenv("CJ_OPEN_ID")),

		OpenCodeAPIKey: strings.TrimSpace(os.Getenv("OPENCODE_ZEN_API_KEY")),
		OpenCodeModel:  strings.TrimSpace(get("OPENCODE_ZEN_MODEL", "grok-code")),
		OpenCodeURL:    strings.TrimSpace(get("OPENCODE_ZEN_URL", "https://api.opencode.ai/v1/chat/completions")),

		NVIDIAAPIKey:                strings.TrimSpace(os.Getenv("NVIDIA_API_KEY")),
		NVIDIAReasonURL:             strings.TrimSpace(os.Getenv("NVIDIA_REASON_URL")),
		NVIDIAPredictURL:            strings.TrimSpace(os.Getenv("NVIDIA_PREDICT_URL")),
		NVIDIATransferURL:           strings.TrimSpace(os.Getenv("NVIDIA_TRANSFER_URL")),
		NVIDIAMaxLiveVariantsPerRun: getInt("NVIDIA_MAX_LIVE_VARIANTS_PER_RUN", 1),
		NVIDIAMinRequestIntervalMS:  getInt("NVIDIA_MIN_REQUEST_INTERVAL_MS", 12000),
		ModalAPIToken:               strings.TrimSpace(os.Getenv("MODAL_API_TOKEN")),
		ModalRenderURL:              strings.TrimSpace(os.Getenv("MODAL_RENDER_URL")),
		ModalStatusURL:              strings.TrimSpace(os.Getenv("MODAL_STATUS_URL")),
		ModalPollIntervalMS:         getInt("MODAL_POLL_INTERVAL_MS", 5000),
		ModalRequestTimeoutSeconds:  getInt("MODAL_REQUEST_TIMEOUT_SECONDS", 480),
		ModalMaxVariantsPerRun:      getInt("MODAL_MAX_VARIANTS_PER_RUN", 6),

		R2AccountID:         strings.TrimSpace(os.Getenv("R2_ACCOUNT_ID")),
		R2AccessKeyID:       strings.TrimSpace(os.Getenv("R2_ACCESS_KEY_ID")),
		R2SecretAccessKey:   strings.TrimSpace(os.Getenv("R2_SECRET_ACCESS_KEY")),
		R2Bucket:            strings.TrimSpace(os.Getenv("R2_BUCKET")),
		R2PresignTTLSeconds: getInt("R2_PRESIGN_TTL_SECONDS", 900),
	}
}

func get(key, fallback string) string {
	v := strings.TrimSpace(os.Getenv(key))
	if v == "" {
		return fallback
	}
	return v
}

func getInt(key string, fallback int) int {
	raw := strings.TrimSpace(os.Getenv(key))
	if raw == "" {
		return fallback
	}
	value, err := strconv.Atoi(raw)
	if err != nil {
		return fallback
	}
	return value
}

func splitCSV(v string) []string {
	parts := strings.Split(v, ",")
	out := make([]string, 0, len(parts))
	for _, p := range parts {
		t := strings.TrimSpace(p)
		if t != "" {
			out = append(out, t)
		}
	}
	return out
}

func sanitizeAllowlist(input []string) []string {
	out := make([]string, 0, len(input))
	for _, origin := range input {
		if origin != "*" {
			out = append(out, origin)
		}
	}
	return out
}
