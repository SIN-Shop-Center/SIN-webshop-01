import { z } from 'zod';

export const TrendPolicySchema = z.object({
  default_decision: z.enum(['allow', 'review_required', 'deny']),
  country_defaults: z.record(z.string(), z.any()).default({}),
  channel_defaults: z.record(z.string(), z.any()).default({}),
  category_policies: z.array(z.object({
    category_key: z.string().min(1),
    country: z.string().min(2),
    channel: z.string().min(1),
    policy_state: z.enum(['allow', 'review_required', 'deny']),
    reason: z.string().nullable().optional(),
    updated_at: z.string().datetime().optional()
  })).default([]),
  updated_at: z.string().datetime().optional()
});

export const TrendCandidateSchema = z.object({
  id: z.string().uuid(),
  product_id: z.string().uuid().nullable().optional(),
  title: z.string().min(1),
  cluster: z.string().min(1),
  score: z.number(),
  lifecycle_state: z.string(),
  decision_state: z.enum(['allow', 'review_required', 'deny'])
});

export const BudgetPolicySchema = z.object({
  scope: z.string(),
  channel: z.string(),
  daily_cap: z.number().nonnegative(),
  weekly_cap: z.number().nonnegative(),
  monthly_cap: z.number().nonnegative(),
  target_mer: z.number().nonnegative(),
  target_roas: z.number().nonnegative(),
  hard_stop: z.boolean()
});

export const RevenueForecastScenarioSchema = z.object({
  ad_spend: z.number().nonnegative(),
  cpc: z.number().positive(),
  organic_lift_pct: z.number().nonnegative(),
  cvr: z.number().min(0).max(100),
  aov: z.number().nonnegative(),
});

export const RevenueForecastPolicySchema = z.object({
  currency: z.string().length(3),
  conservative: RevenueForecastScenarioSchema,
  base: RevenueForecastScenarioSchema,
  scale: RevenueForecastScenarioSchema,
  updated_at: z.string().datetime().optional(),
});

export const RevenueForecastResultSchema = z.object({
  scenario: z.enum(['conservative', 'base', 'scale']),
  currency: z.string().length(3),
  inputs: RevenueForecastScenarioSchema,
  paid_clicks: z.number().nonnegative(),
  organic_sessions: z.number().nonnegative(),
  total_sessions: z.number().nonnegative(),
  orders: z.number().nonnegative(),
  gmv: z.number().nonnegative(),
  mer: z.number().nonnegative(),
  cac: z.number().nonnegative(),
  updated_at: z.string().datetime().optional(),
});

export const ChannelAccountSchema = z.object({
  id: z.string().uuid(),
  channel: z.enum(['tiktok', 'meta', 'youtube_google', 'pinterest', 'snapchat']),
  account_name: z.string(),
  status: z.enum(['connected', 'degraded', 'disconnected', 'error']),
  connection_mode: z.string()
});

export const ChannelConnectStartSchema = z.object({
  status: z.literal('pending'),
  channel: z.enum(['tiktok', 'meta', 'youtube_google', 'pinterest', 'snapchat']),
  state_token: z.string().min(1),
  redirect_url: z.string().min(1),
  required_auth_fields: z.array(z.string()).default([]),
  optional_auth_fields: z.array(z.string()).default([]),
});

export const ChannelConnectCompleteSchema = z.object({
  state_token: z.string().min(1),
  account_external_id: z.string().optional(),
  auth_snapshot: z.record(z.string(), z.any()).default({}),
  health_snapshot: z.record(z.string(), z.any()).default({}),
});

export const AttributionSummaryItemSchema = z.object({
  channel: z.string(),
  attributed_orders: z.number().int().nonnegative(),
  revenue_amount: z.number(),
  cost_amount: z.number(),
  mer: z.number()
});

export const ChannelHealthSchema = z.object({
  channel: z.enum(['tiktok', 'meta', 'youtube_google', 'pinterest', 'snapchat']),
  status: z.string(),
  connection_mode: z.string(),
  healthy: z.boolean(),
  sync_failures_24h: z.number().int().nonnegative(),
  token_present: z.boolean(),
});

export const KPIScoreItemSchema = z.object({
  metric: z.string(),
  current: z.number(),
  target: z.number(),
  unit: z.string(),
  comparator: z.enum(['>=', '<=', '==']),
  ok: z.boolean(),
});

export const CreativeAssetSchema = z.object({
  id: z.string().uuid(),
  channel: z.string(),
  asset_type: z.string(),
  title: z.string().min(1),
  status: z.string(),
});

export const CreatorSchema = z.object({
  id: z.string().uuid(),
  handle: z.string().min(1),
  platform: z.string().min(1),
  status: z.string(),
  region: z.string().min(1),
  score: z.number(),
});

export const AffiliateOfferSchema = z.object({
  id: z.string().uuid(),
  creator_id: z.string().uuid().nullable().optional(),
  code: z.string().min(1),
  commission_pct: z.number().nonnegative(),
  status: z.string(),
});
