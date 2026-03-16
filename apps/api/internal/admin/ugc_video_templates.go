package admin

import "encoding/json"

type UGCVideoTemplate struct {
	ID           string `json:"id"`
	ProductID    string `json:"product_id"`
	HookText     string `json:"hook_text"`
	BodyText     string `json:"body_text"`
	CTA          string `json:"cta"`
	VoiceoverID  string `json:"voiceover_id"`
	BackgroundID string `json:"background_id"`
}

var UGC_Top5_Templates = []UGCVideoTemplate{
	{
		ID:           "tpl_1",
		ProductID:    "CJ-1000",
		HookText:     "POV: Du hast endlich das perfekte Gadget gefunden \U0001f631",
		BodyText:     "Jeder redet darüber, und jetzt weiß ich warum. Diese Qualität ist insane.",
		CTA:          "Link im Profil für 20% Rabatt!",
		VoiceoverID:  "de_jeremy",
		BackgroundID: "bg_tech_unboxing",
	},
	{
		ID:           "tpl_2",
		ProductID:    "CJ-1001",
		HookText:     "Stop scrolling! Das ist ein Gamechanger.",
		BodyText:     "Ich benutze es seit einer Woche und mein Leben hat sich verändert.",
		CTA:          "Hol's dir im Shop \U0001f447",
		VoiceoverID:  "de_jeremy",
		BackgroundID: "bg_lifestyle_demo",
	},
	{
		ID:           "tpl_3",
		ProductID:    "CJ-1002",
		HookText:     "Das Secret für mehr Produktivität...",
		BodyText:     "Vergiss alles andere. Dieses Setup ist next level.",
		CTA:          "Jetzt sichern!",
		VoiceoverID:  "de_jeremy",
		BackgroundID: "bg_desk_setup",
	},
	{
		ID:           "tpl_4",
		ProductID:    "CJ-1003",
		HookText:     "Amazon finds vs Dropshipping gems \U0001f48e",
		BodyText:     "Qualität 10/10, Preis unschlagbar.",
		CTA:          "Schau im Shop vorbei!",
		VoiceoverID:  "de_jeremy",
		BackgroundID: "bg_product_close",
	},
	{
		ID:           "tpl_5",
		ProductID:    "CJ-1004",
		HookText:     "Warum hat mir das niemand früher gesagt?!",
		BodyText:     "Must-have für jeden Haushalt 2026.",
		CTA:          "Link unten!",
		VoiceoverID:  "de_jeremy",
		BackgroundID: "bg_home_clean",
	},
}

func GetUGCTemplates() ([]byte, error) {
	return json.Marshal(UGC_Top5_Templates)
}
