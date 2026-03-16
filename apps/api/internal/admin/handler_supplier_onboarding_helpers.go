package admin

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"os"
	"regexp"
	"strings"
)

var secretPattern = regexp.MustCompile(`(?i)(api[_-]?key|token|secret|password)\s*[:=]\s*([^\s,;]+)`)

func resolveOnboardingCallbackSecret() string {
	candidates := []string{
		os.Getenv("SUPPLIER_ONBOARDING_CALLBACK_SECRET"),
		os.Getenv("N8N_SHARED_SECRET"),
		os.Getenv("SUPPLIER_WEBHOOK_SECRET"),
	}
	for _, value := range candidates {
		if strings.TrimSpace(value) != "" {
			return strings.TrimSpace(value)
		}
	}
	return ""
}

func verifyOnboardingCallbackSignature(secret string, body []byte, header string) bool {
	if strings.TrimSpace(secret) == "" {
		return true
	}
	signature := strings.TrimSpace(header)
	if strings.HasPrefix(signature, "sha256=") {
		signature = strings.TrimPrefix(signature, "sha256=")
	}
	if signature == "" {
		return false
	}
	mac := hmac.New(sha256.New, []byte(secret))
	_, _ = mac.Write(body)
	expected := hex.EncodeToString(mac.Sum(nil))
	return hmac.Equal([]byte(expected), []byte(signature))
}

func redactSecrets(input string) string {
	return secretPattern.ReplaceAllString(input, "$1=[REDACTED]")
}
