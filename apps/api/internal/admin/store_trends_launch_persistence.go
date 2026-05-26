package admin

import (
	"context"
	"encoding/json"
	"errors"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"
)

func (s *Store) upsertTrendLaunch(ctx context.Context, candidateID, channel string, spendCapDaily float64) (*TrendLaunchSummary, bool, error) {
	const insertQuery = `
insert into shop.trend_launches (trend_candidate_id, channel, status, spend_cap_daily, metadata)
values ($1::uuid, $2, 'queued', $3, '{}'::jsonb)
on conflict (trend_candidate_id, channel) do nothing
returning id::text, trend_candidate_id::text, channel, status, spend_cap_daily, started_at, stopped_at, updated_at
`
	var row TrendLaunchSummary
	err := s.pool.QueryRow(ctx, insertQuery, candidateID, channel, spendCapDaily).Scan(
		&row.ID,
		&row.TrendCandidate,
		&row.Channel,
		&row.Status,
		&row.SpendCapDaily,
		&row.StartedAt,
		&row.StoppedAt,
		&row.UpdatedAt,
	)
	if errors.Is(err, pgx.ErrNoRows) {
		return s.loadExistingTrendLaunch(ctx, candidateID, channel)
	}
	if err != nil {
		return nil, false, err
	}
	return &row, true, nil
}

func (s *Store) loadExistingTrendLaunch(ctx context.Context, candidateID, channel string) (*TrendLaunchSummary, bool, error) {
	const existingQuery = `
select id::text, trend_candidate_id::text, channel, status, spend_cap_daily, started_at, stopped_at, updated_at
from shop.trend_launches
where trend_candidate_id::text = $1 and channel = $2
`
	var row TrendLaunchSummary
	err := s.pool.QueryRow(ctx, existingQuery, candidateID, channel).Scan(
		&row.ID,
		&row.TrendCandidate,
		&row.Channel,
		&row.Status,
		&row.SpendCapDaily,
		&row.StartedAt,
		&row.StoppedAt,
		&row.UpdatedAt,
	)
	if err != nil {
		return nil, false, err
	}
	return &row, false, nil
}

func (s *Store) enqueueTrendLaunchEvent(ctx context.Context, launch *TrendLaunchSummary) error {
	body, err := json.Marshal(map[string]any{
		"trend_launch_id":    launch.ID,
		"trend_candidate_id": launch.TrendCandidate,
		"channel":            launch.Channel,
		"spend_cap_daily":    launch.SpendCapDaily,
		"requested_at":       time.Now().UTC().Format(time.RFC3339),
	})
	if err != nil {
		return err
	}
	_, err = s.pool.Exec(ctx, `
insert into shop.event_outbox (event_type, aggregate_type, aggregate_id, payload, status)
values ('trend.candidate.launch.requested', 'trend_launch', $1, $2::jsonb, 'pending')
`, launch.ID, string(body))
	return err
}

func normalizeChannels(input []string) []string {
	allowed := map[string]struct{}{
		"tiktok":         {},
		"meta":           {},
		"youtube_google": {},
		"pinterest":      {},
		"snapchat":       {},
	}
	seen := map[string]struct{}{}
	out := make([]string, 0, len(input))
	for _, raw := range input {
		channel := strings.ToLower(strings.TrimSpace(raw))
		if _, ok := allowed[channel]; !ok {
			continue
		}
		if _, ok := seen[channel]; ok {
			continue
		}
		seen[channel] = struct{}{}
		out = append(out, channel)
	}
	return out
}
