import { AGENT_METADATA, type AgentActionInput } from "./metadata";

type ActionResult = {
  ok: boolean;
  action: string;
  data?: Record<string, unknown>;
  error?: string;
};

type StripeMode = "test" | "live" | "unknown";

export function runAction(input: AgentActionInput): ActionResult {
  const action = String(input.action || "").trim();
  const payload = input.payload ?? {};

  switch (action) {
    case "agent.help":
      return {
        ok: true,
        action,
        data: {
          agent: AGENT_METADATA,
          examples: [
            '{"action":"sin.shop_finance.health"}',
            '{"action":"sin.shop_finance.stripe.verify"}',
            '{"action":"sin.shop_finance.stripe.webhook.plan","payload":{"apiBaseUrl":"https://api.example.com"}}'
          ]
        }
      };
    case "sin.shop_finance.health":
      return {
        ok: true,
        action,
        data: {
          status: "ok",
          agentId: AGENT_METADATA.id,
          env: envPresenceSummary(),
          timestamp: new Date().toISOString()
        }
      };
    case "sin.shop_finance.stripe.verify":
      return verifyStripeConfiguration(action, payload);
    case "sin.shop_finance.stripe.webhook.plan":
      return buildWebhookPlan(action, payload);
    default:
      return {
        ok: false,
        action,
        error: `unsupported_action:${action}`
      };
  }
}

function verifyStripeConfiguration(action: string, payload: Record<string, unknown>): ActionResult {
  const publishableKey = firstNonEmpty(asString(payload.publishableKey), process.env.STRIPE_PUBLISHABLE_KEY, process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY);
  const secretKey = firstNonEmpty(asString(payload.secretKey), process.env.STRIPE_SECRET_KEY);
  const webhookSecret = firstNonEmpty(asString(payload.webhookSecret), process.env.STRIPE_WEBHOOK_SECRET);
  const siteUrl = firstNonEmpty(asString(payload.siteUrl), process.env.SITE_URL);
  const webhookUrl = firstNonEmpty(asString(payload.webhookUrl), asString(payload.apiBaseUrl));

  const checks = {
    publishableKey: checkKeyPrefix(publishableKey, ["pk_test_", "pk_live_"]),
    secretKey: checkKeyPrefix(secretKey, ["sk_test_", "sk_live_"]),
    webhookSecret: checkKeyPrefix(webhookSecret, ["whsec_"]),
    siteUrl: checkUrl(siteUrl),
    webhookUrl: checkUrl(webhookUrl)
  };

  const issues: string[] = [];
  for (const [name, result] of Object.entries(checks)) {
    if (!result.ok) {
      issues.push(`${name}:${result.reason}`);
    }
  }

  const publishableMode = inferStripeMode(publishableKey);
  const secretMode = inferStripeMode(secretKey);
  if (publishableMode !== "unknown" && secretMode !== "unknown" && publishableMode !== secretMode) {
    issues.push(`mode_mismatch:${publishableMode}:${secretMode}`);
  }

  const computedWebhookUrl = checks.webhookUrl.ok
    ? normalizeWebhookUrl(webhookUrl)
    : checks.siteUrl.ok
      ? normalizeWebhookUrl(siteUrl)
      : "";

  return {
    ok: issues.length === 0,
    action,
    data: {
      ready: issues.length === 0,
      mode: publishableMode !== "unknown" ? publishableMode : secretMode,
      issues,
      checks,
      derived: {
        computedWebhookUrl,
        eventTypes: defaultStripeEvents(),
      }
    },
  };
}

function buildWebhookPlan(action: string, payload: Record<string, unknown>): ActionResult {
  const apiBaseUrl = firstNonEmpty(asString(payload.apiBaseUrl), process.env.API_BASE_URL, process.env.SITE_URL);
  const normalizedApiBaseUrl = stripTrailingSlash(apiBaseUrl);
  const primaryWebhookUrl = normalizedApiBaseUrl ? `${normalizedApiBaseUrl}/api/v1/webhooks/stripe` : "/api/v1/webhooks/stripe";

  return {
    ok: true,
    action,
    data: {
      recommendedEndpoint: primaryWebhookUrl,
      alternateEndpoint: "/functions/v1/stripe-webhook",
      events: defaultStripeEvents(),
      envVars: [
        "STRIPE_SECRET_KEY",
        "STRIPE_WEBHOOK_SECRET",
        "STRIPE_PUBLISHABLE_KEY",
        "SITE_URL"
      ],
      codeRefs: [
        "apps/api/internal/http/router.go",
        "apps/api/internal/checkout/webhook.go",
        "workers/edge/functions/stripe-webhook/index.ts",
        "workers/edge/functions/checkout-create/index.ts"
      ]
    }
  };
}

function envPresenceSummary(): Record<string, boolean> {
  return {
    STRIPE_PUBLISHABLE_KEY: Boolean(firstNonEmpty(process.env.STRIPE_PUBLISHABLE_KEY, process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY)),
    STRIPE_SECRET_KEY: Boolean(process.env.STRIPE_SECRET_KEY),
    STRIPE_WEBHOOK_SECRET: Boolean(process.env.STRIPE_WEBHOOK_SECRET),
    SITE_URL: Boolean(process.env.SITE_URL),
    API_BASE_URL: Boolean(process.env.API_BASE_URL)
  };
}

function checkKeyPrefix(value: string, prefixes: string[]): { ok: boolean; reason: string } {
  if (!value) {
    return { ok: false, reason: "missing" };
  }
  if (prefixes.some((prefix) => value.startsWith(prefix))) {
    return { ok: true, reason: "ok" };
  }
  return { ok: false, reason: `unexpected_prefix:${prefixes.join("|")}` };
}

function checkUrl(value: string): { ok: boolean; reason: string } {
  if (!value) {
    return { ok: false, reason: "missing" };
  }
  try {
    const parsed = new URL(value);
    if (!parsed.protocol.startsWith("http")) {
      return { ok: false, reason: "invalid_protocol" };
    }
    return { ok: true, reason: "ok" };
  } catch {
    return { ok: false, reason: "invalid_url" };
  }
}

function inferStripeMode(value: string): StripeMode {
  if (value.startsWith("pk_test_") || value.startsWith("sk_test_")) {
    return "test";
  }
  if (value.startsWith("pk_live_") || value.startsWith("sk_live_")) {
    return "live";
  }
  return "unknown";
}

function normalizeWebhookUrl(value: string): string {
  const base = stripTrailingSlash(value);
  if (!base) {
    return "";
  }
  if (base.endsWith("/api/v1/webhooks/stripe")) {
    return base;
  }
  return `${base}/api/v1/webhooks/stripe`;
}

function defaultStripeEvents(): string[] {
  return [
    "checkout.session.completed",
    "checkout.session.async_payment_succeeded",
    "checkout.session.expired",
    "payment_intent.payment_failed"
  ];
}

function stripTrailingSlash(value: string): string {
  return String(value || "").trim().replace(/\/+$/, "");
}

function firstNonEmpty(...values: Array<string | undefined>): string {
  for (const value of values) {
    const trimmed = String(value || "").trim();
    if (trimmed) {
      return trimmed;
    }
  }
  return "";
}

function asString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}
