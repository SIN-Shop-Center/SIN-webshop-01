package worker

import "testing"

func TestResolveUGCRenderStrategy(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name     string
		options  Options
		run      map[string]any
		wantLane string
		wantProv string
	}{
		{
			name: "quality prefers hybrid when both providers exist",
			options: Options{
				NVIDIAAPIKey:     "x",
				NVIDIAPredictURL: "https://example.com/nvidia",
				NVIDIAReasonURL:  "https://example.com/reason",
				ModalRenderURL:   "https://example.com/modal",
			},
			run: map[string]any{
				"output_pack": "hero_plus_3",
				"input_payload": map[string]any{
					"render_lane":     "quality",
					"render_provider": "auto",
				},
				"settings_snapshot": map[string]any{},
			},
			wantLane: "quality",
			wantProv: "hybrid",
		},
		{
			name: "fast falls back to nvidia when modal missing",
			options: Options{
				NVIDIAAPIKey:     "x",
				NVIDIAPredictURL: "https://example.com/nvidia",
			},
			run: map[string]any{
				"output_pack": "single",
				"input_payload": map[string]any{
					"render_lane": "fast",
				},
				"settings_snapshot": map[string]any{},
			},
			wantLane: "fast",
			wantProv: "nvidia",
		},
		{
			name: "modal preference wins when configured",
			options: Options{
				ModalRenderURL: "https://example.com/modal",
			},
			run: map[string]any{
				"output_pack": "single",
				"input_payload": map[string]any{
					"render_provider": "modal",
				},
				"settings_snapshot": map[string]any{},
			},
			wantLane: "balanced",
			wantProv: "modal",
		},
	}

	for _, test := range tests {
		test := test
		t.Run(test.name, func(t *testing.T) {
			t.Parallel()
			processor := &Processor{options: test.options}
			got := processor.resolveUGCRenderStrategy(test.run)
			if got.Lane != test.wantLane {
				t.Fatalf("lane mismatch: got %q want %q", got.Lane, test.wantLane)
			}
			if got.Provider != test.wantProv {
				t.Fatalf("provider mismatch: got %q want %q", got.Provider, test.wantProv)
			}
		})
	}
}
