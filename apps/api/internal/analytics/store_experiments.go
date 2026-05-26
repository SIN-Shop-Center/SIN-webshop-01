package analytics

import (
	"context"
	"fmt"
	"sort"
	"time"
)

type experimentKey struct {
	experimentID string
	variant      string
}

func (s *Store) ExperimentMetrics(ctx context.Context, since, until time.Time) ([]ExperimentMetric, error) {
	metrics := map[experimentKey]*ExperimentMetric{}

	exposureRows, err := s.experimentExposures(ctx, since, until)
	if err != nil {
		return nil, err
	}
	for _, row := range exposureRows {
		key := experimentKey{experimentID: row.ExperimentID, variant: row.Variant}
		metrics[key] = &ExperimentMetric{
			ExperimentID: row.ExperimentID,
			Variant:      row.Variant,
			Exposures:    row.Count,
		}
	}

	checkoutRows, err := s.eventByExperiment(ctx, since, until, "begin_checkout")
	if err != nil {
		return nil, err
	}
	for _, row := range checkoutRows {
		key := experimentKey{experimentID: row.ExperimentID, variant: row.Variant}
		item := ensureExperiment(metrics, key)
		item.CheckoutStarts = row.Count
	}

	purchaseRows, err := s.eventByExperiment(ctx, since, until, "purchase")
	if err != nil {
		return nil, err
	}
	for _, row := range purchaseRows {
		key := experimentKey{experimentID: row.ExperimentID, variant: row.Variant}
		item := ensureExperiment(metrics, key)
		item.Purchases = row.Count
	}

	out := make([]ExperimentMetric, 0, len(metrics))
	for _, item := range metrics {
		if item.Exposures > 0 {
			item.CheckoutConversionPc = (float64(item.CheckoutStarts) / float64(item.Exposures)) * 100
			item.PurchaseConversionPc = (float64(item.Purchases) / float64(item.Exposures)) * 100
		}
		out = append(out, *item)
	}

	sort.SliceStable(out, func(i, j int) bool {
		if out[i].ExperimentID == out[j].ExperimentID {
			return out[i].Variant < out[j].Variant
		}
		return out[i].ExperimentID < out[j].ExperimentID
	})
	return out, nil
}

type experimentCount struct {
	ExperimentID string
	Variant      string
	Count        int
}

func (s *Store) experimentExposures(ctx context.Context, since, until time.Time) ([]experimentCount, error) {
	const query = `
select payload->>'experiment_id' as experiment_id, payload->>'variant' as variant, count(*)::int as count
from shop.analytics_events
where occurred_at >= $1 and occurred_at < $2
  and event_type = 'trust_panel_opened'
  and payload->>'module' = 'ab_experiment'
  and payload ? 'experiment_id'
  and payload ? 'variant'
group by payload->>'experiment_id', payload->>'variant'
`
	return queryExperimentCounts(ctx, s, query, since, until)
}

func (s *Store) eventByExperiment(ctx context.Context, since, until time.Time, eventType string) ([]experimentCount, error) {
	const query = `
select exp.key as experiment_id, exp.value as variant, count(*)::int as count
from shop.analytics_events e
cross join lateral jsonb_each_text(coalesce(e.payload->'_experiments', '{}'::jsonb)) exp
where e.occurred_at >= $1 and e.occurred_at < $2 and e.event_type = $3
group by exp.key, exp.value
`
	rows, err := s.pool.Query(ctx, query, since, until, eventType)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	out := []experimentCount{}
	for rows.Next() {
		var item experimentCount
		if err := rows.Scan(&item.ExperimentID, &item.Variant, &item.Count); err != nil {
			return nil, err
		}
		out = append(out, item)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return out, nil
}

func queryExperimentCounts(ctx context.Context, s *Store, query string, since, until time.Time) ([]experimentCount, error) {
	rows, err := s.pool.Query(ctx, query, since, until)
	if err != nil {
		return nil, fmt.Errorf("experiment query failed: %w", err)
	}
	defer rows.Close()

	out := []experimentCount{}
	for rows.Next() {
		var item experimentCount
		if err := rows.Scan(&item.ExperimentID, &item.Variant, &item.Count); err != nil {
			return nil, err
		}
		out = append(out, item)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return out, nil
}

func ensureExperiment(metrics map[experimentKey]*ExperimentMetric, key experimentKey) *ExperimentMetric {
	if existing, ok := metrics[key]; ok {
		return existing
	}
	item := &ExperimentMetric{ExperimentID: key.experimentID, Variant: key.variant}
	metrics[key] = item
	return item
}
