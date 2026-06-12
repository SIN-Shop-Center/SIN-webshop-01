# FilterSidebar

Client component for product listing filter sidebar. Renders category and price-range filters.

**Imports from:** `app/produkte/page.tsx`, `app/suche/page.tsx`

## Usage

```tsx
<FilterSidebar categories={categories} activeCategory={params.kategorie} />
```

## Behaviour

- Clicking a category sets `?kategorie=<id>` in the URL
- Clicking a price option sets `?preis_max=<value>`
- Both reset page to 1 (`seite` is cleared)
- Uses `next/navigation` router — no page reload
- Responsive: full width on mobile, 224px sidebar on `md:`
