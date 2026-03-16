package admin

func fallbackPages() []map[string]any {
	return []map[string]any{
		{"id": "impressum", "slug": "impressum", "title": "Impressum", "content": "", "is_published": false},
		{"id": "datenschutz", "slug": "datenschutz", "title": "Datenschutzerklärung", "content": "", "is_published": false},
		{"id": "agb", "slug": "agb", "title": "Allgemeine Geschäftsbedingungen", "content": "", "is_published": false},
		{"id": "widerruf", "slug": "widerrufsbelehrung", "title": "Widerrufsbelehrung", "content": "", "is_published": false},
		{"id": "versand", "slug": "versand", "title": "Versand & Lieferung", "content": "", "is_published": false},
		{"id": "kontakt", "slug": "kontakt", "title": "Kontakt", "content": "", "is_published": false},
		{"id": "ueber-uns", "slug": "ueber-uns", "title": "Über uns", "content": "", "is_published": false},
		{"id": "faq", "slug": "faq", "title": "Häufige Fragen", "content": "", "is_published": false},
	}
}
