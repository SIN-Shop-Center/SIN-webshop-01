package worker

import (
	"context"
	"fmt"
	"strings"
	"sync"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
	"simone-webshop/apps/api/internal/config"
	"simone-webshop/apps/api/internal/objectstore"
)

type Processor struct {
	pool    *pgxpool.Pool
	options Options
	cfg     config.Config

	gmailTokenMu     sync.Mutex
	cachedGmailToken string
	cachedGmailExp   time.Time

	nvidiaRateMu        sync.Mutex
	nvidiaNextRequestAt time.Time

	r2 *objectstore.R2Client
}

func NewProcessor(pool *pgxpool.Pool, options Options, cfg config.Config) *Processor {
	return &Processor{
		pool:    pool,
		options: options,
		cfg:     cfg,
		r2:      options.R2Client,
	}
}

func (p *Processor) logf(format string, args ...any) {
	fmt.Printf("[processor] "+format+"\n", args...)
}

func (p *Processor) Handle(ctx context.Context, job Job) error {
	switch {
	case job.JobType == "checkout.session.requested":
		return p.handleCheckoutSession(ctx, job)
	case job.JobType == "stripe.webhook.received":
		return p.handleStripeWebhook(ctx, job)
	case job.JobType == "order.created":
		return p.handleOrderCreated(ctx, job)
	case job.JobType == "payment.succeeded":
		return p.handlePaymentSucceeded(ctx, job)
	case job.JobType == "supplier.order.requested":
		return p.handleSupplierOrderRequested(ctx, job)
	case job.JobType == "supplier.order.placed":
		return p.handleSupplierOrderPlaced(ctx, job)
	case job.JobType == "supplier.order.failed":
		return p.handleSupplierOrderFailed(ctx, job)
	case job.JobType == "supplier.registration.requested":
		return p.handleSupplierRegistrationRequested(ctx, job)
	case job.JobType == "supplier.registration.step.completed":
		return p.handleSupplierRegistrationStepCompleted(ctx, job)
	case job.JobType == "supplier.registration.completed":
		return p.handleSupplierRegistrationCompleted(ctx, job)
	case job.JobType == "supplier.registration.failed":
		return p.handleSupplierRegistrationFailed(ctx, job)
	case job.JobType == "supplier.catalog.sync.requested":
		return p.handleSupplierCatalogSyncRequested(ctx, job)
	case job.JobType == "supplier.communication.email.send.requested":
		return p.handleSupplierCommunicationEmailSendRequested(ctx, job)
	case job.JobType == "trend.candidate.launch.requested":
		return p.handleTrendCandidateLaunchRequested(ctx, job)
	case job.JobType == "channel.catalog.sync.requested":
		return p.handleChannelCatalogSyncRequested(ctx, job)
	case job.JobType == "channel.campaign.publish.requested":
		return p.handleChannelCampaignPublishRequested(ctx, job)
	case job.JobType == "channel.connect.browser_metadata.requested":
		return p.handleChannelConnectBrowserMetadataRequested(ctx, job)
	case job.JobType == "channel.community.reply.requested":
		return p.handleChannelCommunityReplyRequested(ctx, job)
	case job.JobType == "fulfillment.started":
		return p.handleFulfillmentStarted(ctx, job)
	case job.JobType == "fulfillment.completed":
		return p.handleFulfillmentCompleted(ctx, job)
	case job.JobType == "shipment.updated":
		return p.handleShipmentUpdated(ctx, job)
	case job.JobType == "ai.provider.test":
		return p.handleAIProviderTest(ctx, job)
	case job.JobType == "ai.chat.requested":
		return p.handleAIChatRequested(ctx, job)
	case job.JobType == "social.post.requested":
		return p.handleSocialPostRequested(ctx, job)
	case job.JobType == "creative.ugc.generate.requested":
		return p.handleUGCGenerationRequested(ctx, job)
	case job.JobType == "creative.ugc.autopilot.scan.requested":
		return p.handleUGCAutopilotScanRequested(ctx, job)
	case job.JobType == "creative.ugc.asset.cleanup.requested":
		return p.handleUGCAssetCleanupRequested(ctx, job)
	case job.JobType == "trend.analysis.requested":
		return p.handleTrendRequested(ctx, job)
	case job.JobType == "supplier.research.requested":
		return p.handleSupplierRequested(ctx, job)
	case job.JobType == "inventory.low":
		return p.handleInventoryLow(ctx, job)
	case job.JobType == "inventory.reorder.scan.requested":
		return p.handleInventoryReorderScanRequested(ctx, job)
	case job.JobType == "ops.weekly.report.requested":
		return p.handleOpsWeeklyReport(ctx, job)
	case job.JobType == "cj.tracking.poll":
		return p.handleCJTrackingPoll(ctx, job)
	case job.JobType == "cj.product.sync":
		return p.handleCJProductSync(ctx, job)
	case job.JobType == "cj.balance.check":
		return p.handleCJBalanceCheck(ctx, job)
	case strings.HasPrefix(job.JobType, "automation.") && strings.HasSuffix(job.JobType, ".run"):
		return p.handleAutomationRun(ctx, job)
	default:
		return fmt.Errorf("%w: unsupported job_type %s", ErrPermanent, job.JobType)
	}
}
