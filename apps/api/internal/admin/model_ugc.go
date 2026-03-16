package admin

import "time"

type UGCGeneratorSettings struct {
	Enabled                  bool      `json:"enabled"`
	Mode                     string    `json:"mode"`
	DefaultOutputPack        string    `json:"default_output_pack"`
	DefaultAudioMode         string    `json:"default_audio_mode"`
	DefaultAspectRatio       string    `json:"default_aspect_ratio"`
	DefaultRenderLane        string    `json:"default_render_lane"`
	PreferredRenderProvider  string    `json:"preferred_render_provider"`
	PreferredLanguage        string    `json:"preferred_language"`
	RequiresHumanReview      bool      `json:"requires_human_review"`
	MaxRunsPerProductPerDay  int       `json:"max_runs_per_product_per_day"`
	MaxAutopilotRunsPerSweep int       `json:"max_autopilot_runs_per_sweep"`
	DefaultDurationSeconds   int       `json:"default_duration_seconds"`
	VoiceProfile             string    `json:"voice_profile"`
	UpdatedAt                time.Time `json:"updated_at"`
}
