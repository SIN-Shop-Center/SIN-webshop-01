export type EdgeEnv = {
  supabaseUrl: string;
  supabaseServiceRoleKey: string;
  siteUrl?: string;
  corsAllowlist: string[];
  workerSharedSecret?: string;
  stripeSecretKey?: string;
  stripeWebhookSecret?: string;
  autoFulfill: boolean;
};

function required(name: string): string {
  const value = Deno.env.get(name);
  if (!value || value.trim().length === 0) {
    throw new Error(`missing_env:${name}`);
  }
  return value;
}

function optional(name: string): string | undefined {
  const value = Deno.env.get(name);
  return value && value.trim().length > 0 ? value : undefined;
}

function parseAllowlist(raw: string | undefined): string[] {
  if (!raw) {
    return ["http://localhost:3000", "http://127.0.0.1:3000"];
  }

  return raw
    .split(",")
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

export function loadEdgeEnv(): EdgeEnv {
  return {
    supabaseUrl: required("SUPABASE_URL"),
    supabaseServiceRoleKey: required("SUPABASE_SERVICE_ROLE_KEY"),
    siteUrl: optional("SITE_URL"),
    corsAllowlist: parseAllowlist(optional("CORS_ALLOWLIST")),
    workerSharedSecret: optional("WORKER_SHARED_SECRET"),
    stripeSecretKey: optional("STRIPE_SECRET_KEY"),
    stripeWebhookSecret: optional("STRIPE_WEBHOOK_SECRET"),
    autoFulfill: optional("AUTO_FULFILL") === "true",
  };
}
