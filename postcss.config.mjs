// Purpose: PostCSS config for Next.js to process Tailwind CSS v4
// Docs: https://tailwindcss.com/docs/installation/using-postcss
//
// HINWEIS: Tailwind v4 braucht @tailwindcss/postcss als Plugin —
// ohne dieses Config-File wird globals.css NICHT durch Tailwind gepiped
// und es entstehen ~6KB CSS statt ~30-50KB mit allen Utility-Klassen.
//
// Symptom ohne diese Datei: App sieht unstyled aus, kein grid/flex/spacing.

export default {
  plugins: {
    '@tailwindcss/postcss': {},
  },
}
