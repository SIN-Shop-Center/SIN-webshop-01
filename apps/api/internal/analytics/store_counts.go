package analytics

import (
	"context"
	"time"
)

func (s *Store) CountByEventType(ctx context.Context, since, until time.Time) ([]EventCount, error) {
	const query = `
select event_type, count(*)::int as count
from shop.analytics_events
where occurred_at >= $1 and occurred_at < $2
group by event_type
`
	rows, err := s.pool.Query(ctx, query, since, until)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	out := []EventCount{}
	for rows.Next() {
		var item EventCount
		if err := rows.Scan(&item.EventType, &item.Count); err != nil {
			return nil, err
		}
		out = append(out, item)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return out, nil
}

func (s *Store) CountBySegment(ctx context.Context, since, until time.Time) ([]SegmentCount, error) {
	const query = `
select coalesce(nullif(segment, ''), 'unknown') as segment, event_type, count(*)::int as count
from shop.analytics_events
where occurred_at >= $1 and occurred_at < $2
group by coalesce(nullif(segment, ''), 'unknown'), event_type
`
	rows, err := s.pool.Query(ctx, query, since, until)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	out := []SegmentCount{}
	for rows.Next() {
		var item SegmentCount
		if err := rows.Scan(&item.Segment, &item.EventType, &item.Count); err != nil {
			return nil, err
		}
		out = append(out, item)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return out, nil
}
