package checkout

import (
	"errors"
	"testing"
)

func TestResolveSiteURL(t *testing.T) {
	got, err := ResolveSiteURL("https://shop.example.com/")
	if err != nil {
		t.Fatalf("expected valid site url, got %v", err)
	}
	if got != "https://shop.example.com" {
		t.Fatalf("expected normalized site url, got %q", got)
	}
}

func TestResolveSiteURLRejectsMissingValue(t *testing.T) {
	_, err := ResolveSiteURL("   ")
	if !errors.Is(err, errSiteURLMissing) {
		t.Fatalf("expected errSiteURLMissing, got %v", err)
	}
}

func TestResolveSiteURLRejectsInvalidValue(t *testing.T) {
	_, err := ResolveSiteURL("not-a-url")
	if !errors.Is(err, errSiteURLInvalid) {
		t.Fatalf("expected errSiteURLInvalid, got %v", err)
	}
}
