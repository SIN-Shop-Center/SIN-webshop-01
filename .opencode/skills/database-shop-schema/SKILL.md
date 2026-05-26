# Database Shop Schema Skill

Das Webshop-Datenbank-Schema im `shop`-Schema der PostgreSQL-Datenbank auf der OCI VM (92.5.60.87).

## Verbindung

```bash
DATABASE_URL=postgresql://simone:simone123@92.5.60.87:5433/postgres?search_path=shop
```
Oder via Docker-Netzwerk: `postgresql://simone:simone123@supabase-db:5433/postgres?sslmode=disable&search_path=shop`

## Supabase Studio
- **URL**: http://92.5.60.87:3004
- **Login**: supabase / secure_supabase_2026

## Wichtige Tabellen

### suppliers
- `id` (uuid, PK), `name`, `email`, `website`, `api_endpoint`, `api_key`
- `status` (pending|active|suspended), `rating`, `country`
- `shipping_time_days`, `minimum_order`, `metadata` (jsonb)

### products
- `id` (uuid, PK), `supplier_id` (FK→suppliers), `category_id` (FK→categories)
- `sku`, `name`, `slug`, `description`, `price`, `original_price`
- `images` (jsonb), `variants` (jsonb), `stock`, `is_active`

### categories
- `id` (uuid, PK), `name`, `slug`, `description`, `parent_id`

### orders
- `id` (uuid, PK), `customer_id` (FK→customers)
- `status` (created→paid→processing→supplier_ordered→shipped→delivered|cancelled)
- `subtotal_amount`, `shipping_amount`, `tax_amount`, `total_amount`
- `shipping_address` (jsonb), `tracking_number`, `tracking_url`
- `email`, `payment_status`, `payment_provider`, `payment_reference`

### order_items
- `id` (uuid, PK), `order_id` (FK→orders), `product_id` (FK→products)
- `sku`, `title`, `variant`, `variant_name`, `price`, `quantity`

### supplier_orders
- `id` (uuid, PK), `order_id` (FK→orders)
- `supplier_id` (FK→suppliers), `status` (dispatching|placed|shipped|delivered)
- `channel` (api|email), `external_order_id`, `tracking_number`
- `response_payload` (jsonb) — CJ dispatch result (cj_order_id, pay_status, balance, etc.)

### queue_jobs
- `id` (uuid, PK), `queue_name` (default|automation|ai|social)
- `job_type` (payment.succeeded, supplier.order.requested, shipment.updated, etc.)
- `payload` (jsonb), `status` (pending|processing|succeeded|dead_letter)
- `attempt_count`, `max_attempts`, `last_error`

### checkout_sessions
- `id` (uuid, PK), `order_id` (FK→orders)
- `stripe_session_id`, `status`, `payment_intent`, `metadata`

### profiles (shop)
- `id` (uuid, PK, FK→auth.users), `email`, `first_name`, `last_name`
- `role` (customer|admin), `is_admin`

## n8n Workflows

| Workflow | Beschreibung |
|----------|-------------|
| 01 - Bestellung verarbeiten | Neue Bestellung → Email + Admin-Benachrichtigung |
| 02 - Lieferanten-Bestellung | Bestellung an CJ API senden |
| 03 - Sendungsverfolgung | Tracking-Update alle 2h |
| 06 - Lieferanten-Recherche | Automatische Suche nach Lieferanten (KI) |
| 08 - Stripe Webhook | Zahlungseingang verarbeiten |

n8n URL: http://92.5.60.87:5678 (zukunftsorientierte.energie@gmail.com / simone2026)
