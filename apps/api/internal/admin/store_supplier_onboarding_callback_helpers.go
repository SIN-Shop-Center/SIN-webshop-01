package admin

import (
	"encoding/json"
	"strings"
)

func callbackPayloadJSON(body map[string]any, key string) (string, error) {
	payload := map[string]any{}
	if raw, ok := body[key]; ok && raw != nil {
		if typed, ok := raw.(map[string]any); ok {
			payload = typed
		}
	}
	data, err := json.Marshal(payload)
	if err != nil {
		return "", err
	}
	return string(data), nil
}

func callbackRunStatus(body map[string]any, currentStatus string) string {
	status := strings.ToLower(strings.TrimSpace(asString(body["status"])))
	if status == "" {
		status = currentStatus
	}
	if status == "" {
		return "running"
	}
	return status
}

func callbackActivitySeverity(runStatus string) string {
	switch runStatus {
	case "failed":
		return "error"
	case "awaiting_human":
		return "warning"
	default:
		return "info"
	}
}
