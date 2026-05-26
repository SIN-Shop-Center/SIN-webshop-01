package ai

import (
	"context"
	"encoding/json"
)

func (s *Store) UpdateConfig(ctx context.Context, patch map[string]any) (map[string]any, error) {
	current, err := s.GetConfig(ctx)
	if err != nil {
		return nil, err
	}

	current["provider"] = pickString(patch, "provider", current["provider"])
	current["model"] = pickString(patch, "model", current["model"])
	current["personality"] = pickString(patch, "personality", current["personality"])
	current["language"] = pickString(patch, "language", current["language"])
	current["systemPrompt"] = pickString(patch, "systemPrompt", current["systemPrompt"])
	current["temperature"] = pickFloat(patch, "temperature", current["temperature"])
	current["maxTokens"] = pickInt(patch, "maxTokens", current["maxTokens"])
	current["welcomeMessage"] = pickString(patch, "welcomeMessage", current["welcomeMessage"])
	current["fallbackMessage"] = pickString(patch, "fallbackMessage", current["fallbackMessage"])
	current["enabledFeatures"] = pickMap(patch, "enabledFeatures", current["enabledFeatures"])
	current["workingHours"] = pickMap(patch, "workingHours", current["workingHours"])

	enabledBlob, err := json.Marshal(current["enabledFeatures"])
	if err != nil {
		return nil, err
	}
	workingBlob, err := json.Marshal(current["workingHours"])
	if err != nil {
		return nil, err
	}

	const query = `
insert into shop.ai_config (
  id, provider, model, personality, language, "systemPrompt", temperature, "maxTokens",
  "welcomeMessage", "fallbackMessage", "enabledFeatures", "workingHours"
) values (
  'default', $1, $2, $3, $4, $5, $6, $7, $8, $9, $10::jsonb, $11::jsonb
)
on conflict (id) do update
set provider = excluded.provider,
    model = excluded.model,
    personality = excluded.personality,
    language = excluded.language,
    "systemPrompt" = excluded."systemPrompt",
    temperature = excluded.temperature,
    "maxTokens" = excluded."maxTokens",
    "welcomeMessage" = excluded."welcomeMessage",
    "fallbackMessage" = excluded."fallbackMessage",
    "enabledFeatures" = excluded."enabledFeatures",
    "workingHours" = excluded."workingHours",
    updated_at = now(),
    "updatedAt" = now()
returning provider, model, personality, language, "systemPrompt", temperature, "maxTokens",
          "welcomeMessage", "fallbackMessage", "enabledFeatures", "workingHours"
`

	var provider, model, personality, language, systemPrompt string
	var temperature float64
	var maxTokens int
	var welcomeMessage, fallbackMessage *string
	var enabledRaw, workingRaw []byte

	err = s.pool.QueryRow(ctx, query,
		current["provider"],
		current["model"],
		current["personality"],
		current["language"],
		current["systemPrompt"],
		current["temperature"],
		current["maxTokens"],
		current["welcomeMessage"],
		current["fallbackMessage"],
		string(enabledBlob),
		string(workingBlob),
	).Scan(
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
		return nil, err
	}

	return buildConfig(provider, model, personality, language, systemPrompt, temperature, maxTokens, welcomeMessage, fallbackMessage, enabledRaw, workingRaw), nil
}
