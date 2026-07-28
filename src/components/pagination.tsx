import Link from 'next/link'
import { PAGE_SIZE } from '@/lib/supabase/queries'

interface PaginationProps {
  currentPage: number
  total: number
  basePath: string
  searchParams?: Record<string, string>
}

export function Pagination({ currentPage, total, basePath, searchParams = {} }: PaginationProps) {
  const totalPages = Math.ceil(total / PAGE_SIZE)
  if (totalPages <= 1) return null

  const buildHref = (page: number) => {
    const params = new URLSearchParams({ ...searchParams, seite: String(page) })
    return `${basePath}?${params.toString()}`
  }

  return (
    <nav aria-label="Seitennavigation" className="flex items-center justify-center gap-2 pt-8">
      {currentPage > 1 && (
        <Link
          href={buildHref(currentPage - 1)}
          className="rounded-md border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-muted"
        >
          Zurück
        </Link>
      )}
      <span className="px-3 text-sm text-muted-foreground">
        Seite {currentPage} von {totalPages}
      </span>
      {currentPage < totalPages && (
        <Link
          href={buildHref(currentPage + 1)}
          className="rounded-md border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-muted"
        >
          Weiter
        </Link>
      )}
    </nav>
  )
}
