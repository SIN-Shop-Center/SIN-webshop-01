import { z } from 'zod';

export const AnalyticsEventTypeSchema = z.enum([
  'view_product',
  'add_to_cart',
  'begin_checkout',
  'checkout_step_completed',
  'purchase',
  'checkout_error',
  'contact_support_clicked',
  'trust_panel_opened',
  'onboarding_opened',
  'onboarding_completed',
  'onboarding_skipped',
]);

export const AnalyticsEventSchema = z.object({
  type: AnalyticsEventTypeSchema,
  occurredAt: z.string().datetime(),
  segment: z.enum(['b2c', 'b2b']).optional(),
  route: z.string().optional(),
  payload: z.record(z.any()).default({}),
});

export const EventEnvelopeSchema = z.object({
  id: z.string().uuid(),
  type: z.enum([
    'order.created',
    'payment.succeeded',
    'fulfillment.started',
    'fulfillment.completed',
    'shipment.updated',
    'supplier.order.requested',
    'supplier.order.placed',
    'supplier.order.failed',
    'supplier.registration.browser.requested',
    'ai.chat.requested',
    'social.post.requested',
    'trend.analysis.requested',
    'trend.candidate.launch.requested',
    'supplier.research.requested',
    'supplier.catalog.sync.requested',
    'supplier.catalog.browser.requested',
    'channel.connect.browser_metadata.requested',
    'channel.catalog.sync.requested',
    'channel.campaign.publish.requested',
    'channel.community.reply.requested',
    'budget.threshold.breached',
    'inventory.low',
    'ops.weekly.report.requested'
  ]),
  occurredAt: z.string().datetime(),
  version: z.literal('v1'),
  payload: z.record(z.any())
});

export const OrderCreatedPayloadSchema = z.object({
  orderId: z.string().uuid(),
  customerId: z.string().uuid().optional(),
  totalAmount: z.number().nonnegative(),
  currency: z.string().length(3)
});

export const PaymentSucceededPayloadSchema = z.object({
  orderId: z.string().uuid(),
  paymentReference: z.string().min(1),
  provider: z.enum(['stripe', 'paypal', 'klarna'])
});

export const FulfillmentStartedPayloadSchema = z.object({
  orderId: z.string().uuid(),
  supplierId: z.string().uuid().optional(),
  startedAt: z.string().datetime()
});

export const ShipmentUpdatedPayloadSchema = z.object({
  orderId: z.string().uuid(),
  trackingNumber: z.string().min(1),
  carrier: z.string().min(1),
  status: z.enum(['label_created', 'in_transit', 'delivered', 'exception'])
});

export const AIChatRequestedPayloadSchema = z.object({
  sessionId: z.string().min(1),
  userId: z.string().uuid().optional(),
  message: z.string().min(1)
});

export const SocialPostRequestedPayloadSchema = z.object({
  channel: z.enum(['instagram', 'facebook', 'x', 'tiktok']),
  campaignId: z.string().uuid().optional(),
  content: z.string().min(1)
});

export const TrendCandidateLaunchRequestedPayloadSchema = z.object({
  trendLaunchId: z.string().uuid().optional(),
  trendCandidateId: z.string().uuid(),
  channel: z.enum(['tiktok', 'meta', 'youtube_google', 'pinterest', 'snapchat']),
  spendCapDaily: z.number().nonnegative().optional()
});

export const ChannelSyncRequestedPayloadSchema = z.object({
  id: z.string().uuid().optional(),
  channel: z.enum(['tiktok', 'meta', 'youtube_google', 'pinterest', 'snapchat']),
  syncType: z.enum(['catalog', 'campaign_publish']).optional()
});

export type AnalyticsEventType = z.infer<typeof AnalyticsEventTypeSchema>;
export type AnalyticsEvent = z.infer<typeof AnalyticsEventSchema>;
export type EventEnvelope = z.infer<typeof EventEnvelopeSchema>;
