# n8n Workflows

This folder stores normalized workflow definitions for automation processes.

## Rule

Workflows must consume event payloads from `event_outbox` or `queue_jobs` and must not read from web route internals directly.
Legacy workflow JSON files in this repo are maintained as inactive templates (`"active": false`) to avoid competing domain mutations.

## Event Targets

- `order.created` -> new order post-processing
- `payment.succeeded` -> payment confirmation actions
- `fulfillment.started` -> supplier + shipping orchestration
- `shipment.updated` -> tracking notifications
- `ai.chat.requested` -> AI support orchestration
- `social.post.requested` -> social publishing pipeline

## Source Material

- Existing Simone workflows are under `platform/workers/n8n/simone/workflows`.
- During migration, each workflow should be wrapped with an event-ingestion step and explicit retry handling.
