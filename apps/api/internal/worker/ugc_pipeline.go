package worker

import (
	"context"
	"fmt"
	"strings"
)

type ugcRenderStrategy struct {
	Lane                string
	Provider            string
	UseReason           bool
	UseNVIDIAHeroPass   bool
	UseNVIDIATransfer   bool
	RequestedVariantCap int
	SupportsLiveRender  bool
}

type ugcRenderVariantPlan struct {
	Role      string         `json:"role"`
	Label     string         `json:"label"`
	Direction string         `json:"direction"`
	Prompt    string         `json:"prompt"`
	Seed      int            `json:"seed"`
	Provider  string         `json:"provider"`
	Metrics   map[string]any `json:"metrics,omitempty"`
}

type ugcRenderPlan struct {
	ReferenceImage string                 `json:"reference_image,omitempty"`
	ReasonNotes    string                 `json:"reason_notes,omitempty"`
	Variants       []ugcRenderVariantPlan `json:"variants"`
}

type ugcPreparedPipeline struct {
	Brief     map[string]any
	Strategy  ugcRenderStrategy
	Plan      ugcRenderPlan
	CacheHits map[string]bool
}

func normalizeUGCRenderLane(value string) string {
	switch strings.TrimSpace(value) {
	case "fast":
		return "fast"
	case "quality":
		return "quality"
	default:
		return "balanced"
	}
}

func normalizeUGCRenderProvider(value string) string {
	switch strings.TrimSpace(value) {
	case "nvidia":
		return "nvidia"
	case "modal":
		return "modal"
	case "hybrid":
		return "hybrid"
	default:
		return "auto"
	}
}

func (p *Processor) modalConfigured() bool {
	return strings.TrimSpace(p.options.ModalRenderURL) != ""
}

func (p *Processor) nvidiaPredictConfigured() bool {
	return strings.TrimSpace(p.options.NVIDIAAPIKey) != "" && strings.TrimSpace(p.options.NVIDIAPredictURL) != ""
}

func (p *Processor) nvidiaReasonConfigured() bool {
	return strings.TrimSpace(p.options.NVIDIAAPIKey) != "" && strings.TrimSpace(p.options.NVIDIAReasonURL) != ""
}

func (p *Processor) nvidiaTransferConfigured() bool {
	return strings.TrimSpace(p.options.NVIDIAAPIKey) != "" && strings.TrimSpace(p.options.NVIDIATransferURL) != ""
}

func (p *Processor) modalMaxVariantsPerRun() int {
	if p.options.ModalMaxVariantsPerRun <= 0 {
		return 6
	}
	return p.options.ModalMaxVariantsPerRun
}

func (p *Processor) resolveUGCRenderStrategy(run map[string]any) ugcRenderStrategy {
	input := asMap(run["input_payload"])
	settings := asMap(run["settings_snapshot"])

	lane := normalizeUGCRenderLane(firstNonEmptyUGC(asString(input["render_lane"]), asString(settings["default_render_lane"])))
	preferredProvider := normalizeUGCRenderProvider(firstNonEmptyUGC(asString(input["render_provider"]), asString(settings["preferred_render_provider"])))

	hasModal := p.modalConfigured()
	hasNVIDIA := p.nvidiaPredictConfigured()

	provider := "concept"
	switch preferredProvider {
	case "modal":
		if hasModal {
			provider = "modal"
		} else if hasNVIDIA {
			provider = "nvidia"
		}
	case "nvidia":
		if hasNVIDIA {
			provider = "nvidia"
		} else if hasModal {
			provider = "modal"
		}
	case "hybrid":
		switch {
		case hasModal && hasNVIDIA:
			provider = "hybrid"
		case hasModal:
			provider = "modal"
		case hasNVIDIA:
			provider = "nvidia"
		}
	default:
		switch lane {
		case "fast":
			if hasModal {
				provider = "modal"
			} else if hasNVIDIA {
				provider = "nvidia"
			}
		case "quality":
			if hasModal && hasNVIDIA {
				provider = "hybrid"
			} else if hasNVIDIA {
				provider = "nvidia"
			} else if hasModal {
				provider = "modal"
			}
		default:
			if hasModal && hasNVIDIA {
				provider = "hybrid"
			} else if hasModal {
				provider = "modal"
			} else if hasNVIDIA {
				provider = "nvidia"
			}
		}
	}

	requestedVariantCap := variantCountFromOutputPack(asString(run["output_pack"]))
	if requestedVariantCap <= 0 {
		requestedVariantCap = 1
	}

	strategy := ugcRenderStrategy{
		Lane:                lane,
		Provider:            provider,
		UseReason:           provider != "concept" && lane != "fast" && p.nvidiaReasonConfigured(),
		UseNVIDIAHeroPass:   provider == "hybrid" && hasNVIDIA && lane != "fast",
		UseNVIDIATransfer:   provider != "concept" && lane == "quality" && p.nvidiaTransferConfigured(),
		RequestedVariantCap: requestedVariantCap,
		SupportsLiveRender:  provider != "concept",
	}
	return strategy
}

func (p *Processor) prepareUGCPipeline(ctx context.Context, run map[string]any) (ugcPreparedPipeline, error) {
	cacheHits := map[string]bool{}

	briefCacheKey, err := buildUGCStageCacheKey("ugc_brief_v1", map[string]any{
		"product":       asMap(run["product"]),
		"person_asset":  asMap(run["person_asset"]),
		"input_payload": asMap(run["input_payload"]),
		"output_pack":   asString(run["output_pack"]),
		"audio_mode":    asString(run["audio_mode"]),
		"aspect_ratio":  asString(run["aspect_ratio"]),
	})
	if err != nil {
		return ugcPreparedPipeline{}, err
	}
	brief, briefHit, err := p.resolveUGCBriefCached(ctx, run, briefCacheKey)
	if err != nil {
		return ugcPreparedPipeline{}, err
	}
	cacheHits["brief"] = briefHit

	strategy := p.resolveUGCRenderStrategy(run)
	if !strategy.SupportsLiveRender {
		plan := buildUGCRenderPlan(run, brief, strategy, "", "")
		return ugcPreparedPipeline{
			Brief:     brief,
			Strategy:  strategy,
			Plan:      plan,
			CacheHits: cacheHits,
		}, nil
	}

	referenceImage, err := p.resolveUGCReferenceImageDataURL(ctx, brief)
	if err != nil {
		return ugcPreparedPipeline{}, err
	}

	reasonNotes := ""
	if strategy.UseReason {
		reasonCacheKey, cacheErr := buildUGCStageCacheKey("ugc_reason_v1", map[string]any{
			"brief":           brief,
			"reference_image": referenceImage,
			"lane":            strategy.Lane,
			"provider":        strategy.Provider,
		})
		if cacheErr != nil {
			return ugcPreparedPipeline{}, cacheErr
		}
		reasonNotes, briefHit, err = p.resolveUGCReasonNotesCached(ctx, brief, referenceImage, reasonCacheKey)
		if err != nil {
			return ugcPreparedPipeline{}, err
		}
		cacheHits["reason"] = briefHit
	}

	planCacheKey, err := buildUGCStageCacheKey("ugc_render_plan_v1", map[string]any{
		"brief":       brief,
		"lane":        strategy.Lane,
		"provider":    strategy.Provider,
		"reason":      reasonNotes,
		"output_pack": asString(run["output_pack"]),
	})
	if err != nil {
		return ugcPreparedPipeline{}, err
	}
	plan, planHit, err := p.resolveUGCRenderPlanCached(ctx, run, brief, strategy, referenceImage, reasonNotes, planCacheKey)
	if err != nil {
		return ugcPreparedPipeline{}, err
	}
	cacheHits["plan"] = planHit

	return ugcPreparedPipeline{
		Brief:     brief,
		Strategy:  strategy,
		Plan:      plan,
		CacheHits: cacheHits,
	}, nil
}

func (p *Processor) resolveUGCBriefCached(ctx context.Context, run map[string]any, cacheKey string) (map[string]any, bool, error) {
	if cached, ok, err := p.loadUGCStageCache(ctx, "ugc_brief_v1", cacheKey); err != nil {
		return nil, false, err
	} else if ok {
		if brief := asMap(cached["brief"]); len(brief) > 0 {
			return brief, true, nil
		}
	}
	brief := p.buildUGCBrief(run)
	if err := p.storeUGCStageCache(ctx, "ugc_brief_v1", "system", cacheKey, map[string]any{"brief": brief}, defaultUGCStageCacheTTL); err != nil {
		return nil, false, err
	}
	return brief, false, nil
}

func (p *Processor) resolveUGCReasonNotesCached(ctx context.Context, brief map[string]any, referenceImage, cacheKey string) (string, bool, error) {
	if cached, ok, err := p.loadUGCStageCache(ctx, "ugc_reason_v1", cacheKey); err != nil {
		return "", false, err
	} else if ok {
		if reasonNotes := asString(cached["reason_notes"]); reasonNotes != "" {
			return reasonNotes, true, nil
		}
	}
	reasonResponse, err := p.callNVIDIAJSON(ctx, p.options.NVIDIAReasonURL, map[string]any{
		"prompt": buildUGCReasonPrompt(brief),
		"mode":   "image",
		"image":  referenceImage,
	})
	if err != nil {
		if isTransientNVIDIAError(err) {
			return "", false, nil
		}
		return "", false, err
	}
	reasonNotes := firstNonEmptyUGC(
		asString(reasonResponse["analysis"]),
		asString(reasonResponse["text"]),
		asString(reasonResponse["response"]),
		asString(reasonResponse["output_text"]),
	)
	if err := p.storeUGCStageCache(ctx, "ugc_reason_v1", "nvidia", cacheKey, map[string]any{
		"reason_notes": reasonNotes,
	}, defaultUGCStageCacheTTL); err != nil {
		return "", false, err
	}
	return reasonNotes, false, nil
}

func (p *Processor) resolveUGCRenderPlanCached(ctx context.Context, run map[string]any, brief map[string]any, strategy ugcRenderStrategy, referenceImage, reasonNotes, cacheKey string) (ugcRenderPlan, bool, error) {
	if cached, ok, err := p.loadUGCStageCache(ctx, "ugc_render_plan_v1", cacheKey); err != nil {
		return ugcRenderPlan{}, false, err
	} else if ok {
		rawVariants := asSlice(cached["variants"])
		if len(rawVariants) > 0 {
			plan := ugcRenderPlan{
				ReferenceImage: firstNonEmptyUGC(asString(cached["reference_image"]), referenceImage),
				ReasonNotes:    firstNonEmptyUGC(asString(cached["reason_notes"]), reasonNotes),
				Variants:       make([]ugcRenderVariantPlan, 0, len(rawVariants)),
			}
			for _, raw := range rawVariants {
				item := asMap(raw)
				plan.Variants = append(plan.Variants, ugcRenderVariantPlan{
					Role:      asString(item["role"]),
					Label:     asString(item["label"]),
					Direction: asString(item["direction"]),
					Prompt:    asString(item["prompt"]),
					Seed:      int(asFloat(item["seed"])),
					Provider:  asString(item["provider"]),
					Metrics:   asMap(item["metrics"]),
				})
			}
			if len(plan.Variants) > 0 {
				return plan, true, nil
			}
		}
	}

	plan := buildUGCRenderPlan(run, brief, strategy, referenceImage, reasonNotes)
	if err := p.storeUGCStageCache(ctx, "ugc_render_plan_v1", strategy.Provider, cacheKey, map[string]any{
		"reference_image": plan.ReferenceImage,
		"reason_notes":    plan.ReasonNotes,
		"variants":        plan.Variants,
	}, defaultUGCStageCacheTTL); err != nil {
		return ugcRenderPlan{}, false, err
	}
	return plan, false, nil
}

func buildUGCRenderPlan(run map[string]any, brief map[string]any, strategy ugcRenderStrategy, referenceImage, reasonNotes string) ugcRenderPlan {
	variantSpecs := liveUGCVariantSpecs(variantCountFromOutputPack(asString(run["output_pack"])))
	variants := make([]ugcRenderVariantPlan, 0, len(variantSpecs))
	for index, spec := range variantSpecs {
		provider := strategy.Provider
		if provider == "hybrid" {
			provider = "modal"
			if index == 0 && strategy.UseNVIDIAHeroPass {
				provider = "nvidia"
			}
		}
		variants = append(variants, ugcRenderVariantPlan{
			Role:      spec.Role,
			Label:     spec.Label,
			Direction: spec.Direction,
			Prompt:    buildUGCRenderPrompt(brief, spec, reasonNotes),
			Seed:      index + 1,
			Provider:  provider,
			Metrics: map[string]any{
				"render_lane":     strategy.Lane,
				"render_provider": provider,
			},
		})
	}
	return ugcRenderPlan{
		ReferenceImage: referenceImage,
		ReasonNotes:    reasonNotes,
		Variants:       variants,
	}
}

func buildUGCRenderPrompt(brief map[string]any, spec liveUGCVariantSpec, reasonNotes string) string {
	return strings.TrimSpace(fmt.Sprintf(
		"%s Product: %s. Benefit: %s. Spoken script in German: %s. Subtitle direction: %s. Make the same person from the reference image clearly use the product naturally. %s",
		spec.Direction,
		asString(brief["product_name"]),
		asString(brief["product_description"]),
		asString(brief["script"]),
		asString(brief["subtitle"]),
		strings.TrimSpace(reasonNotes),
	))
}
