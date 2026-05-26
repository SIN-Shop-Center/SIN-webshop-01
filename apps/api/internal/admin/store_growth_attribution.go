package admin

import "context"

func (s *Store) GetAttributionSummary(ctx context.Context) ([]AttributionSummaryItem, error) {
	const query = `
select channel,
       count(*)::int as attributed_orders,
       coalesce(sum(revenue_amount), 0)::float8 as revenue_amount,
       coalesce(sum(cost_amount), 0)::float8 as cost_amount,
       case when coalesce(sum(cost_amount), 0) > 0
            then (sum(revenue_amount) / sum(cost_amount))::float8
            else 0
       end as mer
from shop.attributed_orders
group by channel
order by revenue_amount desc
`
	rows, err := s.pool.Query(ctx, query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	out := make([]AttributionSummaryItem, 0, 8)
	for rows.Next() {
		var row AttributionSummaryItem
		if err := rows.Scan(&row.Channel, &row.AttributedOrders, &row.RevenueAmount, &row.CostAmount, &row.MER); err != nil {
			return nil, err
		}
		out = append(out, row)
	}
	return out, rows.Err()
}
