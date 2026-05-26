package worker

import (
	"time"

	"simone-webshop/apps/api/internal/objectstore"
)

type Options struct {
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

	SiteURL                  string
	N8NWebhookURL            string
	N8NSharedSecret          string
	TikTokBrowserRunnerToken string

	CJAPIKey string
	CJOpenID  string

	ResendAPIKey     string
	ResendFromDomain string

	NVIDIAAPIKey                string
	NVIDIAReasonURL             string
	NVIDIAPredictURL            string
	NVIDIATransferURL           string
	NVIDIAMaxLiveVariantsPerRun int
	NVIDIAMinRequestInterval    time.Duration
	ModalAPIToken               string
	ModalRenderURL              string
	ModalStatusURL              string
	ModalPollInterval           time.Duration
	ModalRequestTimeout         time.Duration
	ModalMaxVariantsPerRun      int

	R2Client *objectstore.R2Client
}
