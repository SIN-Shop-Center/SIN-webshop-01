package admin

import (
	"context"
	"fmt"
	"strings"
)

func (s *Store) ListCustomers(ctx context.Context, p CustomerListParams) ([]map[string]any, int, error) {
	where, args := customerWhereClause(p.Search)

	countQuery := "select count(*) from shop.customers c where " + where
	var total int
	if err := s.pool.QueryRow(ctx, countQuery, args...).Scan(&total); err != nil {
		return nil, 0, err
	}

	sortCol := pickSortColumn(p.SortBy, "c.created_at", map[string]string{
		"created_at": "c.created_at",
		"updated_at": "c.updated_at",
		"name":       "c.name",
		"email":      "c.email",
	})
	sortOrder := normalizeSortOrder(p.SortOrder)

	args = append(args, p.Limit, (p.Page-1)*p.Limit)
	query := fmt.Sprintf(`
select row_to_json(t)::jsonb
from (
  select c.id::text as id,
         c.email,
         c.name,
         c.phone,
         c.address,
         c.metadata,
         c.created_at,
         c.updated_at,
         (select count(*) from shop.orders o where o.customer_id = c.id) as orders_count
  from shop.customers c
  where %s
  order by %s %s
  limit $%d offset $%d
) t
`, where, sortCol, sortOrder, len(args)-1, len(args))

	items, err := queryJSONRows(ctx, s.pool, query, args...)
	if err != nil {
		return nil, 0, err
	}
	return items, total, nil
}

func customerWhereClause(search string) (string, []any) {
	where := []string{"1=1"}
	args := make([]any, 0, 2)
	search = strings.TrimSpace(search)
	if search != "" {
		args = append(args, "%"+search+"%")
		idx := len(args)
		where = append(where, fmt.Sprintf("(c.name ilike $%d or c.email ilike $%d)", idx, idx))
	}
	return strings.Join(where, " and "), args
}

func (s *Store) GetCustomer(ctx context.Context, id string) (map[string]any, error) {
	const customerQuery = `
select row_to_json(t)::jsonb
from (
  select c.id::text as id,
         c.email,
         c.name,
         c.phone,
         c.address,
         c.metadata,
         c.created_at,
         c.updated_at
  from shop.customers c
  where c.id::text = $1
  limit 1
) t
`

	customer, err := queryJSONObject(ctx, s.pool, customerQuery, id)
	if err != nil {
		return nil, err
	}

	const ordersQuery = `
select row_to_json(t)::jsonb
from (
  select o.id::text as id,
         o.status,
         o.total,
         o.payment_status,
         o.created_at
  from shop.orders o
  where o.customer_id::text = $1
  order by o.created_at desc
) t
`
	orders, err := queryJSONRows(ctx, s.pool, ordersQuery, id)
	if err != nil {
		return nil, err
	}

	const statsQuery = `
select count(*), coalesce(sum(total), 0::numeric), max(created_at)
from shop.orders
where customer_id::text = $1
`
	var totalOrders int
	var totalSpent float64
	var lastOrderAt any
	if err := s.pool.QueryRow(ctx, statsQuery, id).Scan(&totalOrders, &totalSpent, &lastOrderAt); err != nil {
		return nil, err
	}

	customer["orders"] = orders
	customer["stats"] = map[string]any{
		"totalOrders":   totalOrders,
		"totalSpent":    totalSpent,
		"lastOrderDate": lastOrderAt,
	}
	return customer, nil
}
