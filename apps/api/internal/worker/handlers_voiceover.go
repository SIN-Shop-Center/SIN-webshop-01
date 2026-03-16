package worker

import (
	"context"
	"encoding/json"
	"fmt"
)

type VoiceoverRequest struct {
	Text        string `json:"text"`
	VoiceID     string `json:"voice_id"`
	Pitch       int    `json:"pitch"`
	Speed       int    `json:"speed"`
	OutputStore string `json:"output_store"`
}

type VoiceoverResponse struct {
	AudioURL string `json:"audio_url"`
	Duration string `json:"duration"`
}

// GenerateVoiceover interacts with WasmTtsEngine
func (p *Processor) GenerateVoiceover(ctx context.Context, job Job) error {
	var req VoiceoverRequest
	if err := json.Unmarshal(job.Payload, &req); err != nil {
		return err
	}

	payload := map[string]any{
		"action": "sin.mindrift.wasmtts.generate",
		"params": req,
	}

	res, err := p.dispatchTikTokBrowserAction(ctx, "/a2a/v1/mindrift", payload)
	if err != nil {
		return fmt.Errorf("failed to generate WasmTtsEngine voiceover: %w", err)
	}

	p.logger.Info("Voiceover generated", "url", res["audio_url"])
	return nil
}
