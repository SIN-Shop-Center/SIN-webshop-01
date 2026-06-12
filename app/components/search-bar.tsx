'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

export function SearchBar() {
  const router = useRouter()
  const [value, setValue] = useState('')

  function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    const q = value.trim()
    if (q) router.push(`/suche?q=${encodeURIComponent(q)}`)
  }

  return (
    <form onSubmit={onSubmit} role="search" className="relative w-full max-w-xs">
      <label htmlFor="header-search" className="sr-only">
        Produkte suchen
      </label>
      <input
        id="header-search"
        type="search"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Suchen..."
        className="w-full rounded-md border border-border bg-background py-2 pl-3 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
      />
    </form>
  )
}
