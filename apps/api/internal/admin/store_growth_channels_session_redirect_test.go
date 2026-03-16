package admin

import "testing"

func TestBuildTikTokConnectRedirectUsesAbsoluteSiteURLWhenConfigured(t *testing.T) {
	t.Setenv("SITE_URL", "https://shop.example.com")

	got := buildTikTokConnectRedirect("/admin/channels?channel=tiktok", "state-123", "received")
	want := "https://shop.example.com/admin/channels?channel=tiktok&oauth_status=received&state=state-123"

	if got != want {
		t.Fatalf("expected %q, got %q", want, got)
	}
}

func TestBuildTikTokConnectRedirectFallsBackToRelativePathWithoutSiteURL(t *testing.T) {
	t.Setenv("SITE_URL", "")

	got := buildTikTokConnectRedirect("", "state-123", "invalid_state")
	want := "/admin/channels?channel=tiktok&oauth_status=invalid_state&state=state-123"

	if got != want {
		t.Fatalf("expected %q, got %q", want, got)
	}
}
