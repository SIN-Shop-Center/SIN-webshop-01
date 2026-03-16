package events

import (
	"context"
	"encoding/json"
	"net/http"
	"os"
	"strings"
)

type Event struct {
	Name       string         `json:"event"`
	Properties map[string]any `json:"properties"`
	UserID     string         `json:"distinct_id"`
}

func TrackPostHogEvent(ctx context.Context, e Event) error {
	apiKey := os.Getenv("POSTHOG_API_KEY")
	if apiKey == "" {
		return nil // Disabled
	}

	payload, _ := json.Marshal(e)
	req, _ := http.NewRequestWithContext(ctx, "POST", "https://eu.posthog.com/capture/", strings.NewReader(string(payload)))
	req.Header.Set("Content-Type", "application/json")

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	return nil
}
