import {defineRouting} from 'next-intl/routing'

export const routing = defineRouting({
  locales: ['de', 'en'],
  defaultLocale: 'de',
  // No pathnames config — simpler middleware that only handles locale prefix,
  // not path rewrites. Pages stay at root: /kasse, /warenkorb, /produkte etc.
  // Access via /de/kasse or /kasse (default).
})