# setup-rls-public-read.sql

## Purpose
After the default-deny RLS rollout, the storefront (Cloudflare Worker) needs explicit SELECT policies to read products, categories, and fx_rates as the anonymous `anon` role.

## Tables Covered
- `shop.products` — product catalog (51 products). `images` is a JSONB column (no `product_images` table). Single `category_id` FK (no `product_categories` junction table).
- `shop.categories` — category tree (24 categories)
- `shop.fx_rates` — currency exchange rates

## Tables NOT in this schema (contrary to spec)
- `shop.product_images` — does not exist; images are in `products.images` JSONB
- `shop.product_categories` — does not exist; category is a FK on `products.category_id`
- `shop.reviews` — does not exist; no review system implemented yet

## Execution
```bash
cat scripts/supabase/setup-rls-public-read.sql | ssh ubuntu@92.5.60.87 \
  "docker exec -i supabase-db psql -U postgres -d postgres -f -"
```

## Prerequisites (applied during initial setup)
1. Add `shop` to PostgREST exposed schemas:
   ```bash
   ssh ubuntu@92.5.60.87 "sed -i 's/^PGRST_DB_SCHEMAS=.*/PGRST_DB_SCHEMAS=public,storage,graphql_public,shop/' /opt/sin-supabase/.env"
   ssh ubuntu@92.5.60.87 "cd /opt/sin-supabase && docker compose up -d rest"
   ```
2. Set search path for authenticator/anon roles:
   ```sql
   ALTER ROLE authenticator SET search_path TO 'shop', 'public', 'extensions';
   ALTER ROLE anon SET search_path TO 'shop', 'public', 'extensions';
   ```

## Verification
```bash
# psql
ssh ubuntu@92.5.60.87 "docker exec supabase-db psql -U postgres -d postgres -c \\"
  \"SELECT schemaname, tablename, policyname, cmd FROM pg_policies WHERE schemaname = 'shop';\\""

# REST API (requires Accept-Profile: shop header)
curl -s "http://localhost:8006/rest/v1/products?select=id,name&limit=3" \
  -H "apikey: $ANON_KEY" \
  -H "Authorization: Bearer $ANON_KEY" \
  -H "Accept-Profile: shop"
```

## Notes
- `FOR SELECT USING (is_active = true)` — only active products visible to public
- `FOR SELECT USING (true)` — world-readable (no auth needed)
- Service role bypasses all RLS
- REST API calls require `Accept-Profile: shop` header when multiple schemas are exposed
- Orders, addresses, users, admin tables remain properly restricted
