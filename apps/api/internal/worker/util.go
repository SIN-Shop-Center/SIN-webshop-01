package worker

import (
	"encoding/json"
	"regexp"
	"strings"
)

var uuidPattern = regexp.MustCompile(`^[0-9a-fA-F-]{36}$`)

func payloadMap(raw []byte) (map[string]any, error) {
	out := map[string]any{}
	if len(raw) == 0 {
		return out, nil
	}
	if err := json.Unmarshal(raw, &out); err != nil {
		return nil, err
	}
	return out, nil
}

func normalizeUUID(raw string) string {
	v := strings.TrimSpace(raw)
	if uuidPattern.MatchString(v) {
		return v
	}
	return ""
}

func asMap(v any) map[string]any {
	m, _ := v.(map[string]any)
	if m == nil {
		return map[string]any{}
	}
	return m
}

func asString(v any) string {
	s, _ := v.(string)
	return strings.TrimSpace(s)
}

func asFloat(v any) float64 {
	switch n := v.(type) {
	case float64:
		return n
	case float32:
		return float64(n)
	case int:
		return float64(n)
	case int64:
		return float64(n)
	default:
		return 0
	}
}

func asBool(v any, fallback bool) bool {
	switch value := v.(type) {
	case bool:
		return value
	case string:
		switch strings.ToLower(strings.TrimSpace(value)) {
		case "true":
			return true
		case "false":
			return false
		}
	}
	return fallback
}
