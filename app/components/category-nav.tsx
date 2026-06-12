import Link from 'next/link'
import { getCategories } from '@/lib/supabase/queries'

export async function CategoryNav() {
  const categories = await getCategories()
  if (categories.length === 0) return null

  const visible = categories.slice(0, 6)

  return (
    <nav aria-label="Kategorien" className="border-b border-border bg-background">
      <div className="mx-auto flex w-full max-w-7xl items-center gap-1 overflow-x-auto px-4 py-2 sm:px-6 lg:px-8">
        <Link
          href="/produkte"
          className="whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium text-foreground hover:bg-muted"
        >
          Alle Produkte
        </Link>
        {visible.map((cat) => (
          <Link
            key={cat.id}
            href={`/kategorie/${cat.slug}`}
            className="whitespace-nowrap rounded-md px-3 py-1.5 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            {cat.name}
          </Link>
        ))}
      </div>
    </nav>
  )
}
