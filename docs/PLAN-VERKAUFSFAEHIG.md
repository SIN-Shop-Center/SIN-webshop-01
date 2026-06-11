# Komplettpaket: SIN-Webshop verkaufsfähig machen

> Entscheidung: Next.js/Serverless statt Go-Backend (kein eigener Server nötig, ein Deploy auf Vercel)
> Bezug: Issues #20–#26 (siehe unten)
> Stand: 2026-06-11 — Schritte 1–3 in Umsetzung, 4–6 offen

## Migrations-Status (Issues #20–#26)

| # | Schritt | Status | Commit |
|---|---------|:------:|--------|
| 20 | Next.js-App aufsetzen + UI portieren | ✅ | `18d7ea9` |
| 21 | Supabase (bestehende self-hosted Instanz) + Auth | ✅ | `a35bbd7` |
| 22 | Cart + Wishlist via Server Actions | ✅ | `e232892` |
| 23 | Stripe Hosted Checkout + Resend Mail | ⬜ blocked (Prerequisites ausstehend) | — |
| 24 | Rechtstexte final | 🟡 Platzhalter im Code | — |
| 25 | Stripe-Key-Rotation + Force-Dynamic → ISR | ⬜ (nach Step 23) | — |
| 26 | Aufräumen: `apps/web`, `apps/api`, Worker | ⬜ (zuletzt) | — |

## Ausgangslage

- `apps/web` ist eine Vite-SPA (React 19, Tailwind v4, ~15 Komponenten, 1150-Zeilen-App.tsx)
- Kein einziger API-Call: Produkte hartcodiert in `data.ts`, Warenkorb/Bestellungen/Login nur in localStorage
- `CheckoutModal.tsx` sammelt echte Kartendaten ein (PCI-Risiko) — muss komplett raus
- Go-Backend (`apps/api`) wird NICHT genutzt → bleibt liegen, wird später entfernt

## Zielarchitektur

Neue Next.js-App (App Router) ersetzt die Vite-SPA.

| Baustein | Technologie |
|---|---|
| Frontend + Backend | Next.js 16 (App Router), API-Routes / Server Actions auf Vercel |
| Datenbank | Neon (Postgres) + Drizzle ORM |
| Zahlungen | Stripe Checkout (gehostete Checkout-Seite, keine Kartendaten bei uns) |
| E-Mails | Resend (Bestellbestätigungen) |

## Umsetzungsschritte

### 1. Next.js-App aufsetzen + UI portieren
- Neue Next.js-16-App als Hauptprojekt (ersetzt `apps/web`)
- Komponenten portieren: Navbar, Hero, ProductCard, QuickViewModal, ProductDetailsModal, CartDrawer, CartPage, MobileNav, Notification, ErrorBoundary
- Entfernen: CheckoutModal (PCI-Risiko), AuthModal (fake), TemuLuckyBox (Glücksspiel-Optik, rechtlich heikel), CustomerDashboard (fake Login)
- Produktseiten als echte Routen (`/produkt/[slug]`) → SEO
- Design/Look beibehalten (orange Stil), aber seriöser

### 2. Neon-Datenbank + Produktdaten
- Drizzle-Schema: `products` (Varianten/Farben/Größen als jsonb), `orders`, `order_items`, `reviews`
- Bestehende 18 Produkte aus `data.ts` in die DB seeden
- Produkte serverseitig aus der DB rendern (RSC) — kein localStorage mehr für Produktdaten
- Warenkorb bleibt clientseitig (OK für Gastbestellungen)

### 3. Stripe Checkout
- Server Action: Cart → Stripe Checkout Session (Preise serverseitig aus DB validiert, nie vom Client vertrauen)
- Erfolgs-/Abbruchseiten (`/bestellung/erfolg`, `/warenkorb`)
- Stripe-Webhook (`/api/webhooks/stripe`): `checkout.session.completed` → Order in DB speichern, Lagerbestand reduzieren
- Fixe Versandkosten (wie bisher), Struktur Stripe-Tax-fähig

### 4. Bestellbestätigung per E-Mail (Resend)
- Nach Webhook-Eingang: Bestätigungsmail an Kunden + Benachrichtigung an Shop-Betreiber
- RESEND_API_KEY als Env-Var (vorher geleakten Key rotieren!)

### 5. Rechtstexte (DE-Pflicht)
- Seiten: `/impressum`, `/agb`, `/widerruf`, `/datenschutz` mit Platzhalter-Templates (deutlich markiert)
- Footer-Links auf allen Seiten
- Checkbox im Checkout-Flow: AGB/Widerruf akzeptieren vor Weiterleitung zu Stripe
- Kein Cookie-Banner nötig, solange keine Tracking-Cookies gesetzt werden

### 6. Aufräumen + Verifizieren
- Alte Vite-App, Go-API, Worker, Docker-Reste entfernen
- Build + TypeScript-Check
- Browser-Test: Produktliste → Produktseite → Warenkorb → Stripe Checkout (Testmodus) → Erfolgsseite

## Manuelle Aufgaben (nur der Betreiber kann das)

- [ ] Geleakte Keys rotieren: **Stripe zuerst**, dann Cloudflare, Resend, CJ, Supabase
- [ ] Rechtstexte-Platzhalter mit echten Firmendaten füllen (Impressum etc.)
- [ ] Nach Fertigstellung: Domain delqhi.com auf das neue Vercel-Deployment zeigen lassen
- [ ] Git-History bereinigen (`git filter-repo`) oder Repo privat stellen — alte Keys sind in der History

## Risiken / Hinweise

- Portierung von 1150 Zeilen App.tsx ist der größte Brocken — wird in saubere Routen/Komponenten zerlegt
- Bestehende Unsplash-Bilder bleiben vorerst (Fallback existiert); echte Produktbilder später
- Reviews: ehrlicher Leerzustand bleibt; echtes Review-Submit (verifiziert per Bestellung) ist Folgeausbau
