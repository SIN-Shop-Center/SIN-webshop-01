package worker

import (
	"fmt"
	"strings"
)

func toStringSlice(raw any) []string {
	switch typed := raw.(type) {
	case []string:
		return typed
	case []any:
		out := make([]string, 0, len(typed))
		for _, value := range typed {
			parsed := strings.TrimSpace(fmt.Sprint(value))
			if parsed != "" {
				out = append(out, parsed)
			}
		}
		return out
	default:
		return nil
	}
}
