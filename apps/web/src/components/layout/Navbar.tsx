'use client'

import { useEffect, useRef, useState } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import { useCustomerSegmentStore } from '@/features/segment/store'
import { useCartStore, useUIStore } from '@/lib/store'
import type { NavItem } from './navbar-items'
import { NavbarView } from './NavbarView'

export function Navbar() {
  const headerContentRef = useRef<HTMLDivElement | null>(null)
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const searchParamsValue = searchParams.toString()
  const searchQuery = searchParams.get('search') || searchParams.get('q') || ''
  const itemCount = useCartStore((state) => state.itemCount)
  const segment = useCustomerSegmentStore((state) => state.segment)
  const toggleCart = useUIStore((state) => state.toggleCart)
  const toggleMobileMenu = useUIStore((state) => state.toggleMobileMenu)
  const closeMobileMenu = useUIStore((state) => state.closeMobileMenu)
  const isMobileMenuOpen = useUIStore((state) => state.isMobileMenuOpen)
  const [isHeaderCollapsed, setIsHeaderCollapsed] = useState(false)
  const [expandedHeaderHeight, setExpandedHeaderHeight] = useState<number>(0)

  const activeSegment = searchParams.get('segment')
  const navQueryKeys = new Set(['badge', 'segment', 'category'])
  const isNavItemActive = (item: NavItem) => {
    if (pathname !== item.href) return false

    if (item.segment && activeSegment !== item.segment) return false
    if (item.query) {
      return Object.entries(item.query).every(([key, value]) => searchParams.get(key) === value)
    }

    if (!item.segment) {
      const hasNavQuery = Array.from(navQueryKeys).some((key) => searchParams.has(key))
      if (hasNavQuery) return false
    }

    return true
  }

  const buildNavHref = (item: NavItem) => {
    const params = new URLSearchParams()
    if (item.segment) params.set('segment', item.segment)
    if (item.query) {
      Object.entries(item.query).forEach(([key, value]) => params.set(key, value))
    }
    const query = params.toString()
    return query ? `${item.href}?${query}` : item.href
  }

  useEffect(() => {
    if (isMobileMenuOpen) closeMobileMenu()
  }, [closeMobileMenu, isMobileMenuOpen, pathname, searchParamsValue])

  useEffect(() => {
    // Route / filter changes should always bring the header back.
    setIsHeaderCollapsed(false)
  }, [pathname, searchParamsValue])

  useEffect(() => {
    if (!isMobileMenuOpen) return
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closeMobileMenu()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [closeMobileMenu, isMobileMenuOpen])

  useEffect(() => {
    const headerContent = headerContentRef.current
    if (!headerContent) return

    const syncHeaderHeight = () => {
      // Measure the real content height even when the header is collapsed.
      const nextHeight = Math.ceil(headerContent.offsetHeight)
      if (Number.isFinite(nextHeight) && nextHeight > 0) {
        setExpandedHeaderHeight(nextHeight)
      }
    }

    syncHeaderHeight()
    window.addEventListener('resize', syncHeaderHeight)

    let resizeObserver: ResizeObserver | null = null
    if (typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(syncHeaderHeight)
      resizeObserver.observe(headerContent)
    }

    return () => {
      window.removeEventListener('resize', syncHeaderHeight)
      resizeObserver?.disconnect()
    }
  }, [isMobileMenuOpen])

  useEffect(() => {
    const offset = isHeaderCollapsed ? 0 : expandedHeaderHeight
    document.documentElement.style.setProperty('--site-header-offset', `${offset}px`)
  }, [expandedHeaderHeight, isHeaderCollapsed])

  useEffect(() => {
    // Never collapse while the mobile menu is open.
    if (isMobileMenuOpen) {
      setIsHeaderCollapsed(false)
      return
    }

    let lastY = window.scrollY
    let rafId = 0

    const onScroll = () => {
      if (rafId) return
      rafId = window.requestAnimationFrame(() => {
        rafId = 0
        const y = window.scrollY
        const delta = y - lastY
        lastY = y

        // Always show the header close to the top.
        if (y < 40) {
          setIsHeaderCollapsed(false)
          return
        }

        if (Math.abs(delta) < 10) return
        setIsHeaderCollapsed(delta > 0)
      })
    }

    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
      if (rafId) window.cancelAnimationFrame(rafId)
    }
  }, [isMobileMenuOpen])

  return (
    <NavbarView
      headerContentRef={headerContentRef}
      isHeaderCollapsed={isHeaderCollapsed}
      expandedHeaderHeight={expandedHeaderHeight}
      segment={segment}
      searchQuery={searchQuery}
      itemCount={itemCount}
      isMobileMenuOpen={isMobileMenuOpen}
      buildNavHref={buildNavHref}
      isNavItemActive={isNavItemActive}
      onCloseMobileMenu={closeMobileMenu}
      onToggleMobileMenu={toggleMobileMenu}
      onToggleCart={toggleCart}
    />
  )
}
