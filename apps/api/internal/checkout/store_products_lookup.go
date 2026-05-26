package checkout

import "context"

func (s *Store) LoadCatalogProducts(ctx context.Context, identifiers []string) (map[string]CatalogProduct, error) {
	const query = `
select
  id::text,
  coalesce(nullif(sku, ''), ''),
  coalesce(name, ''),
  round(price * 100)::int,
  exists (
    with supplier_candidates as (
      select ps.supplier_id
      from shop.product_suppliers ps
      where ps.product_id = p.id
        and ps.is_active = true
      union
      select p.supplier_id
    )
    select 1
    from supplier_candidates sc
    join shop.suppliers s on s.id = sc.supplier_id
    where s.auto_fulfill_enabled = true
      and s.status in ('approved', 'active')
      and s.onboarding_status = 'connected'
      and s.compliance_state = 'approved'
      and (
        (
          s.fulfillment_mode = 'api'
          and coalesce(nullif(s.api_endpoint, ''), '') <> ''
          and coalesce(nullif(shop.resolve_supplier_secret_ref(s.api_secret_ref), ''), nullif(s.api_key, ''), '') <> ''
        )
        or
        (
          s.fulfillment_mode = 'email'
          and coalesce(nullif(s.contact_email, ''), nullif(s.email, '')) <> ''
        )
      )
  ) as ready_for_checkout
from shop.products p
where p.is_active = true
  and (p.id::text = any($1::text[]) or p.sku = any($1::text[]))
`

	rows, err := s.pool.Query(ctx, query, identifiers)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	products := make(map[string]CatalogProduct, len(identifiers)*2)
	for rows.Next() {
		var p CatalogProduct
		if err := rows.Scan(&p.ID, &p.SKU, &p.Name, &p.UnitPriceAmount, &p.ReadyForCheckout); err != nil {
			return nil, err
		}
		products[p.ID] = p
		if p.SKU != "" {
			products[p.SKU] = p
		}
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return products, nil
}
