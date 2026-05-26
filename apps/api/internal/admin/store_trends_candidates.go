package admin

import (
	"context"
	"database/sql"
	"strings"
	"time"
)

func (s *Store) ListTrendCandidates(ctx context.Context, decision string, limit, offset int) ([]TrendCandidateSummary, error) {
	query := `
select id::text, product_id::text, title, cluster, score, lifecycle_state, decision_state, decision_reason, created_at, updated_at
from shop.trend_candidates
`
	args := []any{limit, offset}
	if strings.TrimSpace(decision) != "" {
		query += "where decision_state = $3\n"
		args = append(args, decision)
	}
	query += "order by score desc, updated_at desc\nlimit $1 offset $2"

	rows, err := s.pool.Query(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	out := make([]TrendCandidateSummary, 0, limit)
	for rows.Next() {
		var row TrendCandidateSummary
		var productID sql.NullString
		if err := rows.Scan(
			&row.ID,
			&productID,
			&row.Title,
			&row.Cluster,
			&row.Score,
			&row.Lifecycle,
			&row.Decision,
			&row.DecisionReason,
			&row.CreatedAt,
			&row.UpdatedAt,
		); err != nil {
			return nil, err
		}
		if productID.Valid {
			value := productID.String
			row.ProductID = &value
		}
		out = append(out, row)
	}
	return out, rows.Err()
}

func (s *Store) ApproveTrendCandidate(ctx context.Context, id string) (*TrendCandidateSummary, error) {
	const query = `
update shop.trend_candidates
set decision_state = 'allow',
    lifecycle_state = case when lifecycle_state = 'new' then 'validated' else lifecycle_state end,
    approved_at = now(),
    updated_at = now()
where id::text = $1
returning id::text, product_id::text, title, cluster, score, lifecycle_state, decision_state, decision_reason, created_at, updated_at
`

	var row TrendCandidateSummary
	var productID sql.NullString
	err := s.pool.QueryRow(ctx, query, id).Scan(
		&row.ID,
		&productID,
		&row.Title,
		&row.Cluster,
		&row.Score,
		&row.Lifecycle,
		&row.Decision,
		&row.DecisionReason,
		&row.CreatedAt,
		&row.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}
	if productID.Valid {
		value := productID.String
		row.ProductID = &value
	}
	return &row, nil
}

func (s *Store) GetTrendPerformance(ctx context.Context) ([]map[string]any, error) {
	const query = `
with touches as (
  select c.trend_candidate_id, count(*)::int as touch_count
  from shop.attribution_touchpoints t
  left join shop.campaigns c on c.id = t.campaign_id
  group by c.trend_candidate_id
),
orders as (
  select c.trend_candidate_id,
         count(*)::int as order_count,
         coalesce(sum(a.revenue_amount), 0)::numeric as gmv,
         coalesce(sum(a.cost_amount), 0)::numeric as cost
  from shop.attributed_orders a
  left join shop.campaigns c on c.id = a.campaign_id
  group by c.trend_candidate_id
)
select tc.cluster,
       count(distinct tl.id)::int as launches,
       coalesce(sum(o.order_count), 0)::int as orders,
       coalesce(sum(o.gmv), 0)::float8 as gmv,
       case when coalesce(sum(o.cost), 0) > 0 then (sum(o.gmv) / sum(o.cost))::float8 else 0 end as roas,
       case when coalesce(sum(t.touch_count), 0) > 0 then ((sum(o.order_count)::numeric / sum(t.touch_count)::numeric) * 100)::float8 else 0 end as cvr
from shop.trend_candidates tc
left join shop.trend_launches tl on tl.trend_candidate_id = tc.id
left join orders o on o.trend_candidate_id = tc.id
left join touches t on t.trend_candidate_id = tc.id
group by tc.cluster
order by gmv desc, launches desc
`
	rows, err := s.pool.Query(ctx, query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	out := make([]map[string]any, 0, 16)
	for rows.Next() {
		var cluster string
		var launches int
		var orders int
		var gmv float64
		var roas float64
		var cvr float64
		if err := rows.Scan(&cluster, &launches, &orders, &gmv, &roas, &cvr); err != nil {
			return nil, err
		}
		row := map[string]any{
			"cluster":    cluster,
			"launches":   launches,
			"orders":     orders,
			"gmv":        gmv,
			"roas":       roas,
			"cvr":        cvr,
			"updated_at": time.Now().UTC(),
		}
		out = append(out, row)
	}
	return out, rows.Err()
}
