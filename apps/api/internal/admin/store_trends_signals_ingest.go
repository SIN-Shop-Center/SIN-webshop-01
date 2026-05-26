package admin

import (
	"context"
	"encoding/json"
	"strings"
	"time"
)

func (s *Store) IngestTrendSignals(ctx context.Context, items []map[string]any) (TrendSignalsIngestResult, error) {
	if len(items) == 0 {
		return TrendSignalsIngestResult{}, errInvalidInput
	}
	result := TrendSignalsIngestResult{Received: len(items)}
	for _, item := range items {
		inserted, err := s.upsertTrendSignal(ctx, item)
		if err != nil {
			return TrendSignalsIngestResult{}, err
		}
		if inserted {
			result.Inserted++
		} else {
			result.Updated++
		}
	}
	result.At = time.Now().UTC()
	return result, nil
}

func (s *Store) upsertTrendSignal(ctx context.Context, item map[string]any) (bool, error) {
	productID := validUUIDOrEmpty(asString(item["product_id"]))
	source := strings.ToLower(strings.TrimSpace(asString(item["source"])))
	if source == "" {
		return false, errInvalidInput
	}
	country := strings.ToUpper(strings.TrimSpace(asString(item["country"])))
	if country == "" {
		country = "DE"
	}
	signalDate := strings.TrimSpace(asString(item["signal_date"]))
	if signalDate == "" {
		signalDate = time.Now().UTC().Format("2006-01-02")
	}
	meta, err := json.Marshal(asMap(item["metadata"]))
	if err != nil {
		return false, err
	}

	const updateQuery = `
update shop.trend_signals
set search_velocity = $6,
    social_velocity = $7,
    sales_velocity = $8,
    competition_score = $9,
    margin_fit_score = $10,
    metadata = $11::jsonb,
    updated_at = now()
where coalesce(product_id::text, '') = $1
  and source = $2
  and country = $3
  and signal_date = $4::date
`
	updated, err := s.pool.Exec(ctx, updateQuery,
		productID,
		source,
		country,
		signalDate,
		productID,
		asFloat(item["search_velocity"], 0),
		asFloat(item["social_velocity"], 0),
		asFloat(item["sales_velocity"], 0),
		asFloat(item["competition_score"], 0),
		asFloat(item["margin_fit_score"], 0),
		string(meta),
	)
	if err != nil {
		return false, err
	}
	if updated.RowsAffected() > 0 {
		return false, nil
	}

	const insertQuery = `
insert into shop.trend_signals (
  product_id, source, country, signal_date, search_velocity, social_velocity, sales_velocity, competition_score, margin_fit_score, metadata
)
values (nullif($1, '')::uuid, $2, $3, $4::date, $5, $6, $7, $8, $9, $10::jsonb)
`
	_, err = s.pool.Exec(ctx, insertQuery,
		productID,
		source,
		country,
		signalDate,
		asFloat(item["search_velocity"], 0),
		asFloat(item["social_velocity"], 0),
		asFloat(item["sales_velocity"], 0),
		asFloat(item["competition_score"], 0),
		asFloat(item["margin_fit_score"], 0),
		string(meta),
	)
	return true, err
}
