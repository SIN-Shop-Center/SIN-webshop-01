import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

export async function publishOutbox(
  sb: SupabaseClient,
  eventType: string,
  aggregateType: string,
  aggregateId: string,
  payload: Record<string, unknown>,
): Promise<void> {
  const { error } = await sb.from("event_outbox").insert({
    event_type: eventType,
    aggregate_type: aggregateType,
    aggregate_id: aggregateId,
    payload,
  });

  if (error) {
    throw new Error(`outbox_insert_failed:${error.message}`);
  }
}

export async function startInboxEvent(
  sb: SupabaseClient,
  externalEventId: string,
  eventType: string,
  payload: Record<string, unknown>,
): Promise<{ id: string; duplicate: boolean }> {
  const { data: existing } = await sb
    .from("event_inbox")
    .select("id")
    .eq("external_event_id", externalEventId)
    .maybeSingle();

  if (existing?.id) {
    return { id: existing.id, duplicate: true };
  }

  const { data, error } = await sb
    .from("event_inbox")
    .insert({
      external_event_id: externalEventId,
      event_type: eventType,
      payload,
      status: "processing",
      processed_at: null,
      error_message: null,
    })
    .select("id")
    .single();

  if (error || !data?.id) {
    throw new Error(`inbox_insert_failed:${error?.message ?? "unknown"}`);
  }

  return { id: data.id, duplicate: false };
}

export async function finishInboxEvent(
  sb: SupabaseClient,
  inboxId: string,
  success: boolean,
  errorMessage?: string,
): Promise<void> {
  const payload = success
    ? { status: "processed", processed_at: new Date().toISOString(), error_message: null }
    : { status: "failed", processed_at: new Date().toISOString(), error_message: errorMessage ?? "unknown_error" };

  const { error } = await sb
    .from("event_inbox")
    .update(payload)
    .eq("id", inboxId);

  if (error) {
    console.error("inbox_update_failed", error.message);
  }
}
