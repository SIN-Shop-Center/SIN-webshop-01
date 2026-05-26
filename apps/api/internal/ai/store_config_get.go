package ai

import (
	"context"
	"encoding/json"

	"github.com/jackc/pgx/v5"
)

func (s *Store) GetConfig(ctx context.Context) (map[string]any, error) {
	const query = `
select provider, model, personality, language, "systemPrompt", temperature, "maxTokens",
       "welcomeMessage", "fallbackMessage", "enabledFeatures", "workingHours"
from shop.ai_config
where id = 'default'
limit 1
`

	var provider, model, personality, language, systemPrompt string
	var temperature float64
	var maxTokens int
	var welcomeMessage, fallbackMessage *string
	var enabledRaw, workingRaw []byte

	err := s.pool.QueryRow(ctx, query).Scan(
		&provider,
		&model,
		&personality,
		&language,
		&systemPrompt,
		&temperature,
		&maxTokens,
		&welcomeMessage,
		&fallbackMessage,
		&enabledRaw,
		&workingRaw,
	)
	if err != nil {
		if err == pgx.ErrNoRows {
			return cloneMap(defaultConfig), nil
		}
		return nil, err
	}

	enabledFeatures := map[string]any{}
	workingHours := map[string]any{}
	_ = json.Unmarshal(enabledRaw, &enabledFeatures)
	_ = json.Unmarshal(workingRaw, &workingHours)

	cfg := cloneMap(defaultConfig)
	cfg["provider"] = provider
	cfg["model"] = model
	cfg["personality"] = personality
	cfg["language"] = language
	cfg["systemPrompt"] = systemPrompt
	cfg["temperature"] = temperature
	cfg["maxTokens"] = maxTokens
	cfg["enabledFeatures"] = enabledFeatures
	cfg["workingHours"] = workingHours
	if welcomeMessage != nil {
		cfg["welcomeMessage"] = *welcomeMessage
	}
	if fallbackMessage != nil {
		cfg["fallbackMessage"] = *fallbackMessage
	}
	return cfg, nil
}
