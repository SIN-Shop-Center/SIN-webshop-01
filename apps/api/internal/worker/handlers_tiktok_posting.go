package worker

import (
	"context"
	"encoding/json"
	"fmt"
)

type TikTokVideoPost struct {
	VideoURL     string   `json:"video_url"`
	Caption      string   `json:"caption"`
	ShopLinks    []string `json:"shop_links"`
	ScheduleTime string   `json:"schedule_time,omitempty"`
}

func (p *Processor) HandleTikTokVideoPosting(ctx context.Context, job Job) error {
	var post TikTokVideoPost
	if err := json.Unmarshal(job.Payload, &post); err != nil {
		return err
	}

	// Dispatch to SIN-TikTok agent via A2A
	payload := map[string]any{
		"action": "sin.tiktok.video.publish",
		"params": post,
	}

	res, err := p.dispatchTikTokBrowserAction(ctx, "/a2a/v1", payload)
	if err != nil {
		return fmt.Errorf("failed to post video to TikTok: %w", err)
	}

	fmt.Printf("TikTok Video Posted Successfully response=%v\n", res)
	return nil
}
