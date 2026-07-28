// Purpose: Global cart drawer trigger — dispatches open-cart event
// Docs: AGENTS.md

'use client'

import { ReactNode } from 'react'

export function CartDrawerTrigger({
  children,
  ariaLabel = 'Warenkorb öffnen',
}: {
  children: ReactNode
  ariaLabel?: string
}) {
  function open() {
    window.dispatchEvent(new CustomEvent('open-cart'))
  }

  return (
    <button
      type="button"
      onClick={open}
      aria-label={ariaLabel}
      className="inline-flex items-center justify-center"
    >
      {children}
    </button>
  )
}
