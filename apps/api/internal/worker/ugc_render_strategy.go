package worker

import (
	"context"
	"fmt"
	"strings"
	"time"
)

type ugcRenderOutcome struct {
	Variants        []ugcVariant
	RenderMode      string
	Provider        string
	FallbackReason  string
	UsedConceptOnly bool
	RequiresReview  bool
	Meta            map[string]any
}

func (p *Processor) generateUGCOutcome(ctx context.Context, run map[string]any, pipeline ugcPreparedPipeline) (ugcRenderOutcome, error) {
	strategy := pipeline.Strategy
	if !strategy.SupportsLiveRender {
		return ugcRenderOutcome{
			Variants:        p.generateConceptUGCVariants(run, pipeline.Brief),
			RenderMode:      "concept",
			Provider:        "concept",
			UsedConceptOnly: true,
			RequiresReview:  true,
			Meta: map[string]any{
				"render_lane":     strategy.Lane,
				"render_provider": "concept",
			},
		}, nil
	}

	switch strategy.Provider {
	case "modal":
		return p.generateModalOnlyOutcome(ctx, run, pipeline)
	case "hybrid":
		return p.generateHybridOutcome(ctx, run, pipeline)
	case "nvidia":
		return p.generateNVIDIAOnlyOutcome(ctx, run, pipeline)
	default:
		return ugcRenderOutcome{
			Variants:        p.generateConceptUGCVariants(run, pipeline.Brief),
			RenderMode:      "concept",
			Provider:        "concept",
			UsedConceptOnly: true,
			RequiresReview:  true,
		}, nil
	}
}

func (p *Processor) generateModalOnlyOutcome(ctx context.Context, run map[string]any, pipeline ugcPreparedPipeline) (ugcRenderOutcome, error) {
	variants, meta, err := p.renderModalUGCVariants(ctx, run, pipeline.Brief, pipeline.Plan, pipeline.Strategy)
	if err != nil {
		if p.nvidiaPredictConfigured() {
			outcome, fallbackErr := p.generateNVIDIAOnlyOutcome(ctx, run, pipeline)
			if fallbackErr == nil {
				outcome.FallbackReason = err.Error()
				if outcome.Meta == nil {
					outcome.Meta = map[string]any{}
				}
				outcome.Meta["modal_error"] = err.Error()
				return outcome, nil
			}
		}
		if isTransientModalError(err) {
			variants = p.mergeUGCVariantFallbacks(run, pipeline.Brief, nil, pipeline.Strategy.RequestedVariantCap, map[string]any{
				"render_mode":      "concept_fallback",
				"render_provider":  "modal",
				"live_error":       err.Error(),
				"render_lane":      pipeline.Strategy.Lane,
				"requested_source": "modal",
			})
			return ugcRenderOutcome{
				Variants:        variants,
				RenderMode:      "concept",
				Provider:        "modal",
				FallbackReason:  err.Error(),
				UsedConceptOnly: true,
				RequiresReview:  true,
				Meta: map[string]any{
					"modal_error": err.Error(),
				},
			}, nil
		}
		return ugcRenderOutcome{}, err
	}

	liveVariantCount := len(variants)
	variants = p.mergeUGCVariantFallbacks(run, pipeline.Brief, variants, pipeline.Strategy.RequestedVariantCap, map[string]any{
		"render_mode":     "live",
		"render_provider": "modal",
		"render_lane":     pipeline.Strategy.Lane,
	})
	requiresReview := liveVariantCount < pipeline.Strategy.RequestedVariantCap || len(errorsFromMeta(meta)) > 0
	return ugcRenderOutcome{
		Variants:        variants,
		RenderMode:      "live",
		Provider:        "modal",
		UsedConceptOnly: false,
		RequiresReview:  requiresReview,
		Meta:            meta,
	}, nil
}

func (p *Processor) generateNVIDIAOnlyOutcome(ctx context.Context, run map[string]any, pipeline ugcPreparedPipeline) (ugcRenderOutcome, error) {
	variants, errorsByVariant, err := p.generateNVIDIAUGCVariantsFromPlan(ctx, run, pipeline)
	if err != nil {
		if isTransientNVIDIAError(err) {
			variants = p.mergeUGCVariantFallbacks(run, pipeline.Brief, nil, pipeline.Strategy.RequestedVariantCap, map[string]any{
				"render_mode":      "concept_fallback",
				"render_provider":  "nvidia",
				"live_error":       err.Error(),
				"render_lane":      pipeline.Strategy.Lane,
				"requested_source": "nvidia",
			})
			return ugcRenderOutcome{
				Variants:        variants,
				RenderMode:      "concept",
				Provider:        "nvidia",
				FallbackReason:  err.Error(),
				UsedConceptOnly: true,
				RequiresReview:  true,
				Meta: map[string]any{
					"nvidia_error": err.Error(),
				},
			}, nil
		}
		return ugcRenderOutcome{}, err
	}

	liveVariantCount := len(variants)
	variants = p.mergeUGCVariantFallbacks(run, pipeline.Brief, variants, pipeline.Strategy.RequestedVariantCap, map[string]any{
		"render_mode":     "live",
		"render_provider": "nvidia",
		"render_lane":     pipeline.Strategy.Lane,
		"live_errors":     strings.Join(errorsByVariant, "; "),
	})
	requiresReview := len(errorsByVariant) > 0 || liveVariantCount < pipeline.Strategy.RequestedVariantCap
	return ugcRenderOutcome{
		Variants:        variants,
		RenderMode:      "live",
		Provider:        "nvidia",
		UsedConceptOnly: false,
		RequiresReview:  requiresReview,
		Meta: map[string]any{
			"nvidia_errors": errorsByVariant,
			"live_variants": len(variants),
		},
	}, nil
}

func (p *Processor) generateHybridOutcome(ctx context.Context, run map[string]any, pipeline ugcPreparedPipeline) (ugcRenderOutcome, error) {
	outcome, err := p.generateModalOnlyOutcome(ctx, run, pipeline)
	if err != nil {
		return p.generateNVIDIAOnlyOutcome(ctx, run, pipeline)
	}
	if outcome.UsedConceptOnly || !pipeline.Strategy.UseNVIDIAHeroPass {
		outcome.Provider = "hybrid"
		if outcome.Meta == nil {
			outcome.Meta = map[string]any{}
		}
		outcome.Meta["hybrid_mode"] = "modal_primary"
		return outcome, nil
	}

	heroVariant, heroErr := p.generateSingleNVIDIAHeroVariant(ctx, run, pipeline)
	if heroErr == nil && strings.TrimSpace(heroVariant.VideoURL) != "" {
		if len(outcome.Variants) == 0 {
			outcome.Variants = append(outcome.Variants, heroVariant)
		} else {
			outcome.Variants[0] = heroVariant
		}
		if outcome.Meta == nil {
			outcome.Meta = map[string]any{}
		}
		outcome.Meta["hybrid_mode"] = "modal_bulk_nvidia_hero"
		outcome.Meta["hero_provider"] = "nvidia"
		outcome.Provider = "hybrid"
		return outcome, nil
	}

	if outcome.Meta == nil {
		outcome.Meta = map[string]any{}
	}
	if heroErr != nil {
		outcome.Meta["nvidia_hero_error"] = heroErr.Error()
	}
	outcome.Provider = "hybrid"
	outcome.Meta["hybrid_mode"] = "modal_bulk_modal_hero"
	return outcome, nil
}

func (p *Processor) generateNVIDIAUGCVariantsFromPlan(ctx context.Context, run map[string]any, pipeline ugcPreparedPipeline) ([]ugcVariant, []string, error) {
	requested := pipeline.Plan.Variants
	if len(requested) == 0 {
		return nil, nil, fmt.Errorf("%w: no_ugc_variants_requested", ErrPermanent)
	}
	liveVariantCount := minUGC(len(requested), p.nvidiaMaxLiveVariantsPerRun())
	requested = requested[:liveVariantCount]

	variants := make([]ugcVariant, 0, len(requested))
	errorsByVariant := []string{}
	for index, item := range requested {
		response, predictErr := p.callNVIDIAJSON(ctx, p.options.NVIDIAPredictURL, buildUGCPredictPayloadFromPlan(pipeline.Plan.ReferenceImage, item))
		if predictErr != nil {
			errorsByVariant = append(errorsByVariant, fmt.Sprintf("%s: %v", item.Label, predictErr))
			continue
		}
		variant := parseSingleLiveUGCVariant(response, pipeline.Brief, liveUGCVariantSpec{
			Role:      item.Role,
			Label:     item.Label,
			Direction: item.Direction,
		}, index)
		if variant.Metrics == nil {
			variant.Metrics = map[string]any{}
		}
		variant.Metrics["render_provider"] = "nvidia"
		variant.Metrics["render_lane"] = pipeline.Strategy.Lane
		if strings.TrimSpace(variant.VideoURL) == "" {
			errorsByVariant = append(errorsByVariant, fmt.Sprintf("%s: empty video response", item.Label))
			continue
		}
		variants = append(variants, variant)
	}

	if len(variants) == 0 {
		return nil, errorsByVariant, fmt.Errorf("%w: ugc_predict_empty:%s", ErrPermanent, strings.Join(errorsByVariant, "; "))
	}

	if pipeline.Strategy.UseNVIDIATransfer {
		for index := range variants {
			if variants[index].VideoURL == "" {
				continue
			}
			refined, transferErr := p.callNVIDIAJSON(ctx, p.options.NVIDIATransferURL, map[string]any{
				"video_url":     variants[index].VideoURL,
				"aspect_ratio":  asString(run["aspect_ratio"]),
				"variant_label": variants[index].Label,
			})
			if transferErr == nil {
				if updatedURL := firstNonEmptyUGC(asString(refined["video_url"]), asString(refined["output_url"])); updatedURL != "" {
					variants[index].VideoURL = updatedURL
					variants[index].Metrics["refined_by"] = "nvidia_transfer"
				}
			}
		}
	}

	return variants, errorsByVariant, nil
}

func (p *Processor) generateSingleNVIDIAHeroVariant(ctx context.Context, run map[string]any, pipeline ugcPreparedPipeline) (ugcVariant, error) {
	if len(pipeline.Plan.Variants) == 0 {
		return ugcVariant{}, fmt.Errorf("%w: no_hero_variant_requested", ErrPermanent)
	}
	heroPlan := pipeline.Plan.Variants[0]
	response, err := p.callNVIDIAJSON(ctx, p.options.NVIDIAPredictURL, buildUGCPredictPayloadFromPlan(pipeline.Plan.ReferenceImage, heroPlan))
	if err != nil {
		return ugcVariant{}, err
	}
	variant := parseSingleLiveUGCVariant(response, pipeline.Brief, liveUGCVariantSpec{
		Role:      heroPlan.Role,
		Label:     heroPlan.Label,
		Direction: heroPlan.Direction,
	}, 0)
	if variant.Metrics == nil {
		variant.Metrics = map[string]any{}
	}
	variant.Metrics["render_provider"] = "nvidia"
	variant.Metrics["render_lane"] = pipeline.Strategy.Lane
	variant.Metrics["hybrid_role"] = "hero_upgrade"

	if pipeline.Strategy.UseNVIDIATransfer && strings.TrimSpace(variant.VideoURL) != "" {
		refined, transferErr := p.callNVIDIAJSON(ctx, p.options.NVIDIATransferURL, map[string]any{
			"video_url":     variant.VideoURL,
			"aspect_ratio":  asString(run["aspect_ratio"]),
			"variant_label": variant.Label,
		})
		if transferErr == nil {
			if updatedURL := firstNonEmptyUGC(asString(refined["video_url"]), asString(refined["output_url"])); updatedURL != "" {
				variant.VideoURL = updatedURL
				variant.Metrics["refined_by"] = "nvidia_transfer"
			}
		}
	}
	return variant, nil
}

func buildUGCPredictPayloadFromPlan(referenceImage string, variant ugcRenderVariantPlan) map[string]any {
	payload := map[string]any{
		"prompt":        strings.TrimSpace(variant.Prompt),
		"mode":          "image",
		"image":         referenceImage,
		"model_profile": "predict1",
		"seed":          variant.Seed,
	}
	if strings.Contains(strings.ToLower(variant.Prompt), "vertical 9:16") {
		payload["video_params"] = map[string]any{
			"height": 1024,
			"width":  640,
		}
	}
	return payload
}

func (p *Processor) mergeUGCVariantFallbacks(run map[string]any, brief map[string]any, liveVariants []ugcVariant, requestedCount int, fallbackMetrics map[string]any) []ugcVariant {
	if requestedCount <= 0 {
		requestedCount = variantCountFromOutputPack(asString(run["output_pack"]))
	}
	if requestedCount <= 0 {
		requestedCount = 1
	}
	fallbacks := p.generateConceptUGCVariants(run, brief)
	out := make([]ugcVariant, 0, requestedCount)
	out = append(out, liveVariants...)
	for index := len(out); index < requestedCount && index < len(fallbacks); index++ {
		fallback := fallbacks[index]
		if fallback.Metrics == nil {
			fallback.Metrics = map[string]any{}
		}
		for key, value := range fallbackMetrics {
			fallback.Metrics[key] = value
		}
		out = append(out, fallback)
	}
	if len(out) == 0 {
		return fallbacks[:minUGC(requestedCount, len(fallbacks))]
	}
	return out
}

func isTransientModalError(err error) bool {
	if err == nil {
		return false
	}
	message := strings.ToLower(err.Error())
	return strings.Contains(message, "429") ||
		strings.Contains(message, "too many requests") ||
		strings.Contains(message, "timeout") ||
		strings.Contains(message, "deadline exceeded") ||
		strings.Contains(message, "temporarily unavailable") ||
		strings.Contains(message, "modal_api_non_2xx:500") ||
		strings.Contains(message, "modal_api_non_2xx:502") ||
		strings.Contains(message, "modal_api_non_2xx:503") ||
		strings.Contains(message, "modal_api_non_2xx:504")
}

func (p *Processor) outcomeStatus(outcome ugcRenderOutcome) (string, string) {
	if outcome.UsedConceptOnly {
		if outcome.FallbackReason != "" {
			return "qa_review", "Live-Renderer ist gerade ausgelastet. Konzept-Set ist bereit und kann erneut live gerendert werden."
		}
		return "qa_review", "Konzept bereit. Live-Renderings werden aktiv, sobald ein Renderer verfuegbar ist."
	}
	if outcome.RequiresReview {
		return "qa_review", "Live-Set ist bereit. Bitte die Varianten kurz pruefen."
	}
	return "completed", "UGC-Clip bereit"
}

func (p *Processor) outcomePayload(pipeline ugcPreparedPipeline, outcome ugcRenderOutcome) map[string]any {
	cacheSummary := map[string]any{}
	for key, value := range pipeline.CacheHits {
		cacheSummary[key] = value
	}
	body := map[string]any{
		"brief":            pipeline.Brief,
		"variant_count":    len(outcome.Variants),
		"render_mode":      outcome.RenderMode,
		"render_provider":  outcome.Provider,
		"render_lane":      pipeline.Strategy.Lane,
		"review_required":  outcome.RequiresReview,
		"stage_cache_hits": cacheSummary,
		"completed_at":     time.Now().UTC().Format(time.RFC3339),
	}
	for key, value := range outcome.Meta {
		body[key] = value
	}
	if outcome.FallbackReason != "" {
		body["live_fallback_reason"] = outcome.FallbackReason
	}
	return body
}

func errorsFromMeta(meta map[string]any) []string {
	if len(meta) == 0 {
		return nil
	}
	if values := asSlice(meta["errors"]); len(values) > 0 {
		out := make([]string, 0, len(values))
		for _, value := range values {
			if trimmed := strings.TrimSpace(asString(value)); trimmed != "" {
				out = append(out, trimmed)
			}
		}
		return out
	}
	return nil
}
