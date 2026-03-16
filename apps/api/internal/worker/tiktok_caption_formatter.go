package worker

import (
	"fmt"
	"strings"
)

type TikTokCaptionFormatter struct {
	BaseShopURL string
	DefaultTags []string
}

func NewTikTokCaptionFormatter(shopURL string) *TikTokCaptionFormatter {
	return &TikTokCaptionFormatter{
		BaseShopURL: shopURL,
		DefaultTags: []string{"#SimoneWebshop", "#MustHave", "#Trending2026"},
	}
}

// FormatCaption appends the shop product URL and default hashtags
func (f *TikTokCaptionFormatter) FormatCaption(baseCaption string, productSlug string) string {
	link := fmt.Sprintf("%s/products/%s", strings.TrimRight(f.BaseShopURL, "/"), productSlug)

	// Create formatted caption with 2 newlines before the link and tags
	caption := fmt.Sprintf("%s\n\n🛍️ Hol es dir hier: %s\n\n%s",
		strings.TrimSpace(baseCaption),
		link,
		strings.Join(f.DefaultTags, " "))

	return caption
}
