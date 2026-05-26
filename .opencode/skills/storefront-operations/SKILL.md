# Storefront Operations Skill

Operate the Delqhi webshop storefront (delqhi.com) and backend API (api.delqhi.com).

## URLs

- **Storefront**: https://delqhi.com (Cloudflare Worker)
- **API**: https://api.delqhi.com (Go API via Cloudflare Tunnel)
- **API Health**: `curl https://api.delqhi.com/health`

## Storefront Pages

| Page | URL | Description |
|------|-----|-------------|
| Home | `/` | Hero + featured products |
| Products | `/products` | All active products grid |
| Product Detail | `/products/:slug` | Single product with add-to-cart |
| Cart | `/cart` | Shopping cart |
| Checkout | `/checkout` | Stripe Checkout redirect (Card, SEPA, Klarna) |
| Impressum | `/impressum` | Legal: Impressum |
| AGB | `/agb` | Legal: Terms (Dropshipping) |
| Datenschutz | `/datenschutz` | Legal: Privacy |
| Widerrufsrecht | `/widerrufsrecht` | Legal: Right of withdrawal |
| Versand | `/versand` | Legal: Shipping policy |

## API Endpoints (Go API on port 8080)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Health check (returns product count) |
| GET | `/api/v1/products` | List active products |
| GET | `/api/v1/products/:slug` | Get product by slug |
| POST | `/api/v1/cart/add` | Add item to cart |
| GET | `/api/v1/cart` | Get cart |
| POST | `/api/v1/checkout/create` | Create Stripe checkout session |
| POST | `/api/v1/webhooks/stripe` | Stripe webhook handler |
| POST | `/api/v1/suppliers/webhooks/cj-dropshipping` | CJ webhook handler |

## Stripe Checkout Flow

1. Customer adds items to cart (`POST /api/v1/cart/add`)
2. Customer goes to checkout (`POST /api/v1/checkout/create`)
3. API creates Stripe Checkout Session → returns `session_url` (Card/SEPA/Klarna)
4. Customer pays on Stripe → redirect to success page
5. Stripe webhook → `POST /api/v1/webhooks/stripe` → updates order status
6. Worker auto-dispatches to CJ (3-step: create→confirm→payBalance)
7. CJ ships → webhook updates tracking → shipment email to customer

## Key Files

- `workers/cloudflare/worker.mjs` — Cloudflare Worker (storefront + API proxy)
- `apps/api/internal/storefront/handler.go` — Storefront handler
- `apps/api/internal/checkout/store_orders.go` — Order creation
- `apps/api/internal/suppliers/handler.go` — CJ webhook handler

## Database Tables (shop schema)

| Table | Purpose |
|-------|---------|
| `shop.orders` | Customer orders (status: created→paid→processing→supplier_ordered→shipped→delivered) |
| `shop.order_items` | Line items per order |
| `shop.checkout_sessions` | Stripe checkout sessions |
| `shop.supplier_orders` | CJ order tracking |
| `shop.products` | Product catalog (49 active) |
| `shop.customers` | Customer records |

## Common Operations

### Check API health
```bash
curl -s https://api.delqhi.com/health | python3 -m json.tool
```

### List products
```bash
curl -s https://api.delqhi.com/api/v1/products | python3 -m json.tool
```

### Test checkout
```bash
curl -s -X POST https://api.delqhi.com/api/v1/checkout/create \
  -H "Content-Type: application/json" \
  -d '{"customer_email":"test@example.com","items":[{"product_id":"UUID","quantity":1}]}'
```

### Check orders on VM
```bash
ssh -i ~/.ssh/id_ed25519 ubuntu@92.5.60.87 \
  "docker exec supabase-db psql -U simone -d postgres -c \"SELECT id,status,total,currency FROM shop.orders ORDER BY created_at DESC LIMIT 5\""
```
