# Fix #48 — i18n: zweisprachiger Shop (DE/EN) für EU-Markt-Erweiterung

> **Status:** OPEN · **Priority:** medium · **Repo:** `SIN-Shop-Center/SIN-webshop-01`
> **Issue:** https://github.com/SIN-Shop-Center/SIN-webshop-01/issues/48

## Context

Adds a `next-intl` layer. The existing German URL paths (`/warenkorb`, `/kasse`, etc.) stay default; English users get `/en/cart`, `/en/checkout`. This is a **big refactor** — page moves, every `revalidatePath` adapts, every hardcoded string gets translated.

## Step 1 — install

```sh
pnpm add next-intl
```

## Step 2 — `i18n/routing.ts` (new)

```ts
// i18n/routing.ts
import { defineRouting } from 'next-intl/routing'

export const routing = defineRouting({
  locales: ['de', 'en'],
  defaultLocale: 'de',
  localePrefix: 'as-needed',  // /products = DE, /en/products = EN
  pathnames: {
    '/': '/',
    '/warenkorb': { de: '/warenkorb', en: '/cart' },
    '/kasse/erfolg': { de: '/kasse/erfolg', en: '/checkout/success' },
    '/kasse/abgebrochen': { de: '/kasse/abgebrochen', en: '/checkout/cancelled' },
    '/suche': { de: '/suche', en: '/search' },
    '/agb': { de: '/agb', en: '/terms' },
  },
})
```

## Step 3 — `i18n/request.ts` (new)

```ts
// i18n/request.ts
import { getRequestConfig } from 'next-intl/server'
import { hasLocale } from 'next-intl'
import { routing } from './routing'

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale
  const locale = hasLocale(routing.locales, requested) ? requested : routing.defaultLocale
  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default,
  }
})
```

## Step 4 — `i18n/navigation.ts` (new)

```ts
// i18n/navigation.ts
import { createNavigation } from 'next-intl/navigation'
import { routing } from './routing'

export const { Link, redirect, usePathname, useRouter, getPathname } =
  createNavigation(routing)
```

## Step 5 — `middleware.ts` (update)

```ts
// middleware.ts — kombiniere mit bestehender Logik
import createMiddleware from 'next-intl/middleware'
import { routing } from './i18n/routing'

const intlMiddleware = createMiddleware(routing)

export function middleware(request: any) {
  // ... existing Supabase session refresh etc. ...
  return intlMiddleware(request)
}

export const config = {
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)'],
}
```

## Step 6 — `next.config.ts` (add plugin)

```ts
// next.config.ts
import createNextIntlPlugin from 'next-intl/plugin'
const withNextIntl = createNextIntlPlugin('./i18n/request.ts')

// ... existing config
export default withNextIntl(nextConfig)
```

## Step 7 — page migration: `app/` → `app/[locale]/`

```sh
# Move all user-facing pages (NOT api/)
mv app/page.tsx app/[locale]/page.tsx
mv app/produkte app/[locale]/produkte
mv app/produkt app/[locale]/produkt
mv app/warenkorb app/[locale]/warenkorb
mv app/kasse app/[locale]/kasse
mv app/konto app/[locale]/konto
mv app/suche app/[locale]/suche
mv app/agb app/[locale]/agb
mv app/datenschutz app/[locale]/datenschutz
mv app/widerrufsrecht app/[locale]/widerrufsrecht
mv app/versand app/[locale]/versand
mv app/kontakt app/[locale]/kontakt
mv app/bestellung-verfolgen app/[locale]/bestellung-verfolgen
mv app/sale app/[locale]/sale
mv app/impressum app/[locale]/impressum
# app/api/, app/auth/, app/admin/ BLEIBEN (nicht gemoved!)

# Add the locale layout
cat > app/[locale]/layout.tsx << 'EOF'
import { NextIntlClientProvider, hasLocale } from 'next-intl'
import { setRequestLocale } from 'next-intl/server'
import { notFound } from 'next/navigation'
import { routing } from '@/i18n/routing'

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }))
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  if (!hasLocale(routing.locales, locale)) notFound()
  setRequestLocale(locale)

  return (
    <html lang={locale} className="bg-background">
      <body>
        <NextIntlClientProvider>{children}</NextIntlClientProvider>
      </body>
    </html>
  )
}
EOF
```

## Step 8 — `messages/de.json` (new)

```json
{
  "nav": {
    "home": "Startseite",
    "products": "Produkte",
    "cart": "Warenkorb",
    "account": "Konto"
  },
  "cart": {
    "title": "Warenkorb",
    "empty": "Dein Warenkorb ist leer",
    "checkout": "Zur Kasse",
    "remove": "Entfernen",
    "stockExhausted": "Leider nicht mehr auf Lager",
    "subtotal": "Zwischensumme",
    "shipping": "Versand",
    "total": "Gesamt"
  },
  "product": {
    "addToCart": "In den Warenkorb",
    "outOfStock": "Ausverkauft",
    "inStock": "{count} auf Lager"
  },
  "checkout": {
    "title": "Bestellung",
    "pay": "Bezahlen",
    "success": "Vielen Dank für deine Bestellung!"
  },
  "errors": { "generic": "Etwas ist schiefgelaufen. Bitte versuche es erneut." }
}
```

## Step 9 — `messages/en.json` (new)

```json
{
  "nav": {
    "home": "Home",
    "products": "Products",
    "cart": "Cart",
    "account": "Account"
  },
  "cart": {
    "title": "Cart",
    "empty": "Your cart is empty",
    "checkout": "Checkout",
    "remove": "Remove",
    "stockExhausted": "Sorry, out of stock",
    "subtotal": "Subtotal",
    "shipping": "Shipping",
    "total": "Total"
  },
  "product": {
    "addToCart": "Add to cart",
    "outOfStock": "Out of stock",
    "inStock": "{count} in stock"
  },
  "checkout": {
    "title": "Order",
    "pay": "Pay",
    "success": "Thank you for your order!"
  },
  "errors": { "generic": "Something went wrong. Please try again." }
}
```

## Step 10 — convert hardcoded strings

```sh
grep -rn "Warenkorb\|Bestellung\|Bezahlen\|In den Warenkorb" app/ components/ | head -30
```

Replace each with:

```tsx
// Server Component
import { getTranslations } from 'next-intl/server'
const t = await getTranslations('cart')
return <h1>{t('title')}</h1>

// Client Component
import { useTranslations } from 'next-intl'
const t = useTranslations('cart')
return <button>{t('checkout')}</button>
```

## Step 11 — revalidatePath calls

```tsx
// In cart.ts, checkout.ts, returns.ts — replace
import { revalidatePath } from 'next/cache'
// with
import { revalidatePath } from 'next-intl/navigation'

// Then use:
revalidatePath('/warenkorb', 'page')  // for both locales
// or
revalidatePath('/', 'layout')
```

## Step 12 — Locale-Switcher component

```tsx
// app/components/locale-switcher.tsx
'use client'

import { useLocale } from 'next-intl'
import { usePathname, useRouter } from '@/i18n/navigation'

export function LocaleSwitcher() {
  const locale = useLocale()
  const pathname = usePathname()
  const router = useRouter()

  return (
    <select
      aria-label="Sprache wählen"
      value={locale}
      onChange={(e) => router.replace(pathname, { locale: e.target.value as 'de' | 'en' })}
      className="rounded-md border border-border bg-background px-2 py-1 text-sm"
    >
      <option value="de">DE</option>
      <option value="en">EN</option>
    </select>
  )
}
```

Place in `app/[locale]/layout.tsx` (in the navbar).

## Acceptance

- `/` (German default) and `/en/` (English) both render
- 0 hardcoded German strings in `app/[locale]/`
- All German UI has English equivalent in `messages/en.json`
- Locale-Switcher changes the language

## Closing

```sh
gh issue close 48 -R SIN-Shop-Center/SIN-webshop-01 \
  --comment "next-intl integriert: DE (default) + EN. Alle Seiten migriert, alle Strings übersetzt."
```
