package worker

import (
	"context"
	"net/http"
	"strings"
	"time"
)

const (
	defaultNVIDIAMaxLiveVariantsPerRun = 1
	defaultNVIDIAMinRequestInterval    = 12 * time.Second
)

func (p *Processor) nvidiaMaxLiveVariantsPerRun() int {
	if p.options.NVIDIAMaxLiveVariantsPerRun <= 0 {
		return defaultNVIDIAMaxLiveVariantsPerRun
	}
	return p.options.NVIDIAMaxLiveVariantsPerRun
}

func (p *Processor) nvidiaMinRequestInterval() time.Duration {
	if p.options.NVIDIAMinRequestInterval <= 0 {
		return defaultNVIDIAMinRequestInterval
	}
	return p.options.NVIDIAMinRequestInterval
}

func (p *Processor) reserveNVIDIARequestSlot(ctx context.Context) error {
	now := time.Now()
	wait := time.Duration(0)

	p.nvidiaRateMu.Lock()
	slot := now
	if p.nvidiaNextRequestAt.After(slot) {
		slot = p.nvidiaNextRequestAt
	}
	p.nvidiaNextRequestAt = slot.Add(p.nvidiaMinRequestInterval())
	wait = slot.Sub(now)
	p.nvidiaRateMu.Unlock()

	if wait <= 0 {
		return nil
	}

	timer := time.NewTimer(wait)
	defer timer.Stop()

	select {
	case <-ctx.Done():
		return ctx.Err()
	case <-timer.C:
		return nil
	}
}

func (p *Processor) extendNVIDIABackoff(delay time.Duration) {
	if delay <= 0 {
		return
	}

	target := time.Now().Add(delay)
	p.nvidiaRateMu.Lock()
	if target.After(p.nvidiaNextRequestAt) {
		p.nvidiaNextRequestAt = target
	}
	p.nvidiaRateMu.Unlock()
}

func retryAfterDelay(value string) time.Duration {
	trimmed := strings.TrimSpace(value)
	if trimmed == "" {
		return 0
	}
	if seconds, err := time.ParseDuration(trimmed + "s"); err == nil && seconds > 0 {
		return seconds
	}
	if parsed, err := http.ParseTime(trimmed); err == nil {
		delay := time.Until(parsed)
		if delay > 0 {
			return delay
		}
	}
	return 0
}

func isTransientNVIDIAError(err error) bool {
	if err == nil {
		return false
	}
	message := strings.ToLower(err.Error())
	return strings.Contains(message, "429") ||
		strings.Contains(message, "too many requests") ||
		strings.Contains(message, "timeout") ||
		strings.Contains(message, "deadline exceeded") ||
		strings.Contains(message, "temporarily unavailable") ||
		strings.Contains(message, "nvidia_api_non_2xx:500") ||
		strings.Contains(message, "nvidia_api_non_2xx:502") ||
		strings.Contains(message, "nvidia_api_non_2xx:503") ||
		strings.Contains(message, "nvidia_api_non_2xx:504")
}

func maxDuration(a, b time.Duration) time.Duration {
	if a > b {
		return a
	}
	return b
}
