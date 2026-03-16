package checkout

import (
	"errors"
	"net/url"
	"strings"

	"github.com/jackc/pgx/v5/pgconn"
)

var errSiteURLMissing = errors.New("site_url_missing")
var errSiteURLInvalid = errors.New("site_url_invalid")

func collectItemIdentifiers(items []SessionItem) []string {
	seen := make(map[string]struct{}, len(items))
	out := make([]string, 0, len(items))
	for _, item := range items {
		key := strings.TrimSpace(item.SKU)
		if key == "" {
			continue
		}
		if _, ok := seen[key]; ok {
			continue
		}
		seen[key] = struct{}{}
		out = append(out, key)
	}
	return out
}

func isUniqueViolation(err error) bool {
	var pgErr *pgconn.PgError
	return errors.As(err, &pgErr) && pgErr.Code == "23505"
}

func toSessionResponse(row *CheckoutSessionRecord) SessionResponse {
	return SessionResponse{
		OrderID:         row.OrderID,
		CheckoutURL:     row.CheckoutURL,
		StripeSessionID: row.StripeSessionID,
		Status:          row.Status,
	}
}

func ResolveSiteURL(siteURL string) (string, error) {
	trimmed := strings.TrimSpace(siteURL)
	if trimmed == "" {
		return "", errSiteURLMissing
	}
	parsed, err := url.Parse(trimmed)
	if err != nil || parsed.Scheme == "" || parsed.Host == "" {
		return "", errSiteURLInvalid
	}
	return strings.TrimRight(trimmed, "/"), nil
}
