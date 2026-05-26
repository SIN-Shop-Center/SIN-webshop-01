package main

import (
	"context"
	"log"
	"os"
	"time"

	"simone-webshop/apps/api/internal/config"
	"simone-webshop/apps/api/internal/db"
	"simone-webshop/apps/api/internal/events"
	"simone-webshop/apps/api/internal/objectstore"
	"simone-webshop/apps/api/internal/worker"
)

func main() {
	cfg := config.Load()
	if err := cfg.ValidateWorker(); err != nil {
		log.Fatalf("invalid worker configuration: %v", err)
	}

	pool, err := db.Connect(cfg.DatabaseURL)
	if err != nil {
		log.Fatalf("database connection failed: %v", err)
	}
	defer pool.Close()

	r2Client, err := objectstore.NewR2(context.Background(), objectstore.R2Config{
		AccountID:       cfg.R2AccountID,
		AccessKeyID:     cfg.R2AccessKeyID,
		SecretAccessKey: cfg.R2SecretAccessKey,
		Bucket:          cfg.R2Bucket,
		PresignTTL:      time.Duration(cfg.R2PresignTTLSeconds) * time.Second,
	})
	if err != nil {
		log.Fatalf("r2 configuration failed: %v", err)
	}

	ctx := context.Background()
	store := worker.NewStore(pool)
	processor := worker.NewProcessor(pool, worker.Options{
		GoogleServiceAccountJSONB64: cfg.GoogleServiceAccountJSONB64,
		GoogleServiceAccountFile:    cfg.GoogleServiceAccountFile,
		GmailDelegatedUser:          cfg.GmailDelegatedUser,
		GmailSenderFrom:             cfg.GmailSenderFrom,
		GmailAPIBaseURL:             cfg.GmailAPIBaseURL,
		BillingCompanyName:          cfg.BillingCompanyName,
		BillingAddress:              cfg.BillingAddress,
		BillingTaxID:                cfg.BillingTaxID,
		BillingVATID:                cfg.BillingVATID,
		InvoiceOutputDir:            cfg.InvoiceOutputDir,
		SiteURL:                     cfg.SiteURL,
		N8NWebhookURL:               cfg.N8NWebhookURL,
		N8NSharedSecret:             cfg.N8NSharedSecret,
		TikTokBrowserRunnerToken:    cfg.TikTokBrowserRunnerToken,
		NVIDIAAPIKey:                cfg.NVIDIAAPIKey,
		NVIDIAReasonURL:             cfg.NVIDIAReasonURL,
		NVIDIAPredictURL:            cfg.NVIDIAPredictURL,
		NVIDIATransferURL:           cfg.NVIDIATransferURL,
		NVIDIAMaxLiveVariantsPerRun: cfg.NVIDIAMaxLiveVariantsPerRun,
		NVIDIAMinRequestInterval:    time.Duration(cfg.NVIDIAMinRequestIntervalMS) * time.Millisecond,
		ModalAPIToken:               cfg.ModalAPIToken,
		ModalRenderURL:              cfg.ModalRenderURL,
		ModalStatusURL:              cfg.ModalStatusURL,
		ModalPollInterval:           time.Duration(cfg.ModalPollIntervalMS) * time.Millisecond,
		ModalRequestTimeout:         time.Duration(cfg.ModalRequestTimeoutSeconds) * time.Second,
		ModalMaxVariantsPerRun:      cfg.ModalMaxVariantsPerRun,
		R2Client:                    r2Client,
		CJAPIKey:                    cfg.CJAPIKey,
		CJOpenID:                    cfg.CJOpenID,
		ResendAPIKey:                cfg.ResendAPIKey,
		ResendFromDomain:            cfg.ResendFromDomain,
	}, cfg)
	workerName := os.Getenv("WORKER_NAME")
	if workerName == "" {
		workerName = "api-worker"
	}

	for {
		outboxProcessed, err := events.ProcessOutbox(ctx, pool)
		if err != nil {
			log.Printf("outbox cycle failed: %v", err)
		}

		queueProcessed, qErr := worker.ProcessQueues(ctx, store, processor, workerName, 25)
		if qErr != nil {
			log.Printf("queue cycle failed: %v", qErr)
		}

		log.Printf("worker cycle completed, outbox_processed=%d queue_processed=%d", outboxProcessed, queueProcessed)
		time.Sleep(5 * time.Second)
	}
}
