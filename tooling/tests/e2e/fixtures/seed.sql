insert into shop.categories (id, name, slug, description, is_active)
values (
  '00000000-0000-4000-8000-000000000101',
  'E2E Fixtures',
  '__e2e-fixtures__',
  'Deterministic local browser-test data',
  true
)
on conflict (id) do update set name = excluded.name, is_active = true;

insert into shop.products (
  id, name, title_de, slug, sku, description_de, price, original_price,
  category_id, images, image_url_local, image_gallery, stock, is_active,
  variants, metadata, pipeline_state, approval_state, creative_status,
  data_quality_score, manufacturer_verified, responsible_person_verified
)
values (
  '00000000-0000-4000-8000-000000000102',
  'E2E Test Product',
  'E2E Testprodukt',
  '__e2e-test-product__',
  '__e2e_sku__',
  'Deterministisches Produkt fuer lokale Browser- und Integrationstests.',
  19.99,
  29.99,
  '00000000-0000-4000-8000-000000000101',
  '["/og-image.png"]'::jsonb,
  '/og-image.png',
  array['/og-image.png'],
  20,
  true,
  '[{"vid":"__e2e_variant__","cj_variant_id":"__e2e_variant__","name":"Standard"}]'::jsonb,
  '{"e2e_fixture":true,"is_featured":true}'::jsonb,
  'enriched',
  'approved',
  'approved',
  100,
  false,
  false
)
on conflict (id) do update set
  stock = 20,
  is_active = true,
  updated_at = now();

insert into public.customers (id, email, name, metadata)
values (
  '00000000-0000-4000-8000-000000000106',
  'e2e-customer@tests.invalid',
  'E2E Test Customer',
  '{"e2e_fixture":true}'::jsonb
)
on conflict (id) do update set email = excluded.email, metadata = excluded.metadata;

insert into shop.cart_items (id, cart_id, product_id, variant_id, quantity)
values (
  '00000000-0000-4000-8000-000000000103',
  '00000000-0000-4000-8000-000000000107',
  '00000000-0000-4000-8000-000000000102',
  '__e2e_variant__',
  1
)
on conflict (id) do update set quantity = 1, updated_at = now();

insert into shop.orders (
  id, email, customer_name, amount_total, status, payment_status,
  fulfillment_status, stripe_session_id, items
)
values (
  '00000000-0000-4000-8000-000000000104',
  'e2e-customer@tests.invalid',
  'E2E Test Customer',
  1999,
  'paid',
  'paid',
  'pending',
  'cs_test_e2e_fixture',
  '[{"product_id":"00000000-0000-4000-8000-000000000102","variant_id":"__e2e_variant__","title":"E2E Testprodukt","quantity":1,"unit_amount":1999}]'::jsonb
)
on conflict (id) do update set status = excluded.status, updated_at = now();

insert into shop.return_requests (id, order_id, reason, status)
values (
  '00000000-0000-4000-8000-000000000105',
  '00000000-0000-4000-8000-000000000104',
  '__e2e_fixture_return__',
  'pending'
)
on conflict (id) do update set status = excluded.status;
