# Produkte Page (`/produkte`)

Product listing page with sidebar filter, sort, grid, and pagination.

**Imports:** `FilterSidebar`, `ProductGrid`, `Pagination`, `SortSelect`, `getProductsPage`, `getCategories`

## Search params

| Param | Type | Description |
|---|---|---|
| `seite` | number | Page number (default: 1) |
| `sortierung` | string | Sort option (neueste, preis-auf, preis-ab, name) |
| `kategorie` | UUID | Category ID filter |
| `preis_max` | number | Max price filter (converted to cents) |

## Layout

- Desktop: 224px sidebar + flexible grid area in a row
- Mobile: filter hidden behind `<details>` toggle, grid full width
