'use client'

import { useEffect, useState } from 'react'
import { PromotionBannerListSchema, type CustomerSegment, type PromotionBanner } from '@simone/contracts'

type PromotionPlacement = 'header' | 'pdp' | 'cart'

type PromotionState = {
  items: PromotionBanner[]
  loading: boolean
  error: string | null
}

type PromotionCacheEntry = {
  items: PromotionBanner[]
  expiresAt: number
}

const INITIAL_STATE: PromotionState = {
  items: [],
  loading: true,
  error: null,
}

const PROMOTIONS_TTL_MS = 60_000
const PROMOTIONS_CACHE_MAX_ENTRIES = 24
const promotionsCache = new Map<string, PromotionCacheEntry>()
const promotionsInFlight = new Map<string, Promise<PromotionBanner[]>>()

function cacheKey(placement: PromotionPlacement, segment: CustomerSegment): string {
  return `${placement}:${segment}`
}

function readCachedPromotions(key: string): PromotionBanner[] | null {
  const cached = promotionsCache.get(key)
  if (!cached) {
    return null
  }
  if (cached.expiresAt <= Date.now()) {
    promotionsCache.delete(key)
    return null
  }
  return cached.items
}

function readStalePromotions(key: string): PromotionBanner[] | null {
  const cached = promotionsCache.get(key)
  return cached?.items || null
}

function trimPromotionsCache() {
  if (promotionsCache.size <= PROMOTIONS_CACHE_MAX_ENTRIES) {
    return
  }

  const now = Date.now()
  const expiredKeys: string[] = []
  promotionsCache.forEach((entry, key) => {
    if (entry.expiresAt <= now) {
      expiredKeys.push(key)
    }
  })
  expiredKeys.forEach((key) => promotionsCache.delete(key))

  while (promotionsCache.size > PROMOTIONS_CACHE_MAX_ENTRIES) {
    const oldestKey = promotionsCache.keys().next().value as string | undefined
    if (!oldestKey) {
      return
    }
    promotionsCache.delete(oldestKey)
  }
}

function writeCachedPromotions(key: string, items: PromotionBanner[]): PromotionBanner[] {
  if (promotionsCache.has(key)) {
    promotionsCache.delete(key)
  }

  promotionsCache.set(key, {
    items,
    expiresAt: Date.now() + PROMOTIONS_TTL_MS,
  })

  trimPromotionsCache()
  return items
}

async function fetchActivePromotions(
  key: string,
  placement: PromotionPlacement,
  segment: CustomerSegment,
): Promise<PromotionBanner[]> {
  const cached = readCachedPromotions(key)
  if (cached) {
    return cached
  }

  const existing = promotionsInFlight.get(key)
  if (existing) {
    return existing
  }

  const request = (async () => {
    const query = new URLSearchParams({
      placement,
      segment,
      limit: '3',
    })
    const response = await fetch(`/api/promotions/active?${query.toString()}`, {
      method: 'GET',
      cache: 'no-store',
      keepalive: true,
    })
    if (!response.ok) {
      throw new Error(`promotions_fetch_failed:${response.status}`)
    }
    const payload = PromotionBannerListSchema.parse(await response.json())
    return writeCachedPromotions(key, payload.items)
  })()

  promotionsInFlight.set(key, request)
  try {
    return await request
  } finally {
    promotionsInFlight.delete(key)
  }
}

export function useActivePromotions(placement: PromotionPlacement, segment: CustomerSegment) {
  const [state, setState] = useState<PromotionState>(INITIAL_STATE)

  useEffect(() => {
    let active = true
    const key = cacheKey(placement, segment)

    const cachedItems = readCachedPromotions(key)
    if (cachedItems) {
      setState({
        items: cachedItems,
        loading: false,
        error: null,
      })
      return () => {
        active = false
      }
    }

    const run = async () => {
      setState((current) => ({ ...current, loading: true, error: null }))
      try {
        const items = await fetchActivePromotions(key, placement, segment)
        if (!active) {
          return
        }
        setState({ items, loading: false, error: null })
      } catch (error) {
        if (!active) {
          return
        }
        const stale = readStalePromotions(key)
        if (stale) {
          setState({
            items: stale,
            loading: false,
            error: null,
          })
          return
        }
        setState({
          items: [],
          loading: false,
          error: error instanceof Error ? error.message : 'promotions_fetch_failed',
        })
      }
    }

    void run()
    return () => {
      active = false
    }
  }, [placement, segment])

  return state
}
