# Delqhi Shop Strategie 2026

## Executive Summary

**Ziel:** Vollautomatisierte Dropshipping-Maschine mit CJ Dropshipping als Lieferant, Stripe als Payment-Provider und parallelem TikTok Shop Wachstumskanal.

**Status:**
- Eigener Shop (delqhi.com): Online, Stripe Live, 2 CJ-Produkte
- TikTok Shop: Noch nicht gestartet
- Haupt-Blocker: CJ Balance = $0 (muss aufgeladen werden)

---

## Architektur-Übersicht

```mermaid
graph TB
    subgraph "Kunde"
        A[delqhi.com / TikTok Shop]
    end

    subgraph "Payment"
        B[Stripe Checkout]
        C[SEPA + Klarna]
        D[Stripe Standard Payout 3T]
        E[Stripe Instant Payout 30min]
    end

    subgraph "Backend (OCI VM)"
        F[Go API :8080]
        G[Go Worker Poll 5s]
        H[Supabase PostgreSQL]
    end

    subgraph "Supplier"
        I[CJ Dropshipping API]
        J[CJ Balance $0]
    end

    subgraph "Fulfillment"
        K[Cloudflare Worker SSR]
        L[Resend E-Mail]
    end

    A -->|Kauft| B
    B -->|Webhook| F
    F -->|Queue Job| H
    G -->|Polls| H
    G -->|createOrder| I
    I -->|ship| G
    G -->|E-Mail| L
    B -->|Payout| D
    D -->|nach 3 Tagen| E
```

---

## Cashflow & Timeline

```mermaid
gantt
    title Parallel-Strategie Timeline
    dateFormat  YYYY-MM-DD
    axisFormat  %d.%m

    section Eigenen Shop
    CJ $30 aufladen           :done, cj1, 2026-05-27, 1d
    Testbestellung            :active, test, after cj1, 2d
    Instant Payouts prüfen    :active, ip, after test, 14d
    Resend Domain setup       :pending, res, 2026-06-01, 7d
    Mehr Produkte            :pending, prod, 2026-06-05, 14d

    section TikTok Shop
    Seller Account erstellen  :pending, tt1, 2026-05-28, 3d
    Produkte ins Lager        :pending, tt2, after tt1, 7d
    TikTok Shop live          :pending, tt3, after tt2, 3d
    Erste Verkäufe            :pending, tt4, after tt3, 14d
    31-Tage-Haltefrist        :pending, tt5, after tt4, 31d
    Storfund Daily Advance    :pending, tt6, after tt5, 14d
```

---

## Status-Maschine (Order Lifecycle)

```mermaid
stateDiagram-v2
    [*] --> created : Kunde kauft
    created --> paid : Stripe payment.succeeded
    paid --> processing : Worker processed
    processing --> supplier_ordered : CJ createOrder+payBalance OK
    supplier_ordered --> shipped : CJ webhook (tracking)
    shipped --> delivered : Paket zugestellt
    delivered --> [*]

    paid --> failed : CJ payBalance FAIL
    failed --> refunded : Stripe refund
    refunded --> [*]
```

---

## CJ 3-Step Auto-Pay Flow

```mermaid
sequenceDiagram
    actor Kunde
    participant Shop as delqhi.com
    participant Stripe
    participant API as Go API
    participant DB as Supabase
    participant Worker as Go Worker
    participant CJ as CJ Dropshipping

    Kunde->>Shop: Produkt kaufen
    Shop->>Stripe: Checkout Session
    Kunde->>Stripe: Bezahlen (SEPA/Klarna)
    Stripe->>API: webhook: payment.succeeded
    API->>DB: queue_jobs: status=created
    Note over Worker: Poll every 5s
    Worker->>DB: Pull job from queue
    Worker->>CJ: POST /api/order/create (payType=2)
    CJ-->>Worker: Order created, UNPAID
    Worker->>CJ: POST /api/order/confirm
    Worker->>CJ: POST /api/order/payBalance
    alt CJ Balance >= Order Total
        CJ-->>Worker: payment SUCCESS
        Worker->>DB: status=supplier_ordered
    else CJ Balance < Order Total
        CJ-->>Worker: Balance insufficient
        Worker->>DB: status=failed + alert
    end
```

---

## TikTok Shop Parallel-Strategie

```mermaid
flowchart LR
    subgraph "Phase 1: Eigenen Shop"
        A1[delqhi.com] -->|Umsatz| A2[Stripe Instant Payouts]
        A2 -->|nach 30 Tagen| A3[1% Gebühr]
        A1 -->|Margin 2.5x| A4[CJ Balance refill]
    end

    subgraph "Phase 2: TikTok Shop"
        B1[TikTok Seller] -->|31 Tage Hold| B2[Geld fließt zurück]
        B2 -->|nach 6 Monaten| B3[Storfund Daily Advance]
        B3 -->|Tag +1| B4[80% sofort]
    end

    subgraph "Cashflow Loop"
        C1[Eigen Shop Verkauf] -->|€28| C2[Stripe 3T]
        C2 -->|€27.44| C3[CJ Aufladung]
        C3 -->|€11.20| C4[Produktkosten]
        C4 -->|€16.24| C5[Reinvestition]
    end
```

---

## Kritische Pfade & Blocker

| Blocker | Status | Lösung | Priorität |
|---------|--------|--------|-----------|
| CJ Balance $0 | ❌ Blockiert alles | $30 per PayPal aufladen | 🔴 Kritisch |
| Stripe Instant Payouts | ⚠️ Noch nicht sichtbar | Nach erstem Verkauf ca. 14–30 Tage | 🟡 Mittel |
| Resend Domain | ⚠️ via resend.dev | Domain verify bei Resend + DNS | 🟡 Mittel |
| TikTok Seller Account | ❌ Nicht erstellt | Registrierung starten | 🟢 Niedrig |
| TikTok 31-Tage-Hold | ❌ Unvermeidlich | €300–500 Startkapital | 🟡 Mittel |

---

## Sofortige Action Items

1. **CJ Balance aufladen:** $30 via PayPal/Kreditkarte im CJ Dashboard
2. **Testbestellung:** Eigenes Produkt auf delqhi.com kaufen (Kreditkarte)
3. **TikTok registrieren:** [seller.tiktok.com](https://seller.tiktok.com) — Account erstellen
4. **Stripe Instant Payouts:** Täglich Dashboard prüfen ab Tag 1 nach erstem Verkauf
5. **Resend Domain:** [resend.com/domains](https://resend.com/domains) — delqhi.com hinzufügen

---

## Zahlen & Margen

| Produkttyp | VK Preis | CJ Kosten | Marge | Stripe Gebühr | Netto |
|------------|----------|-----------|-------|---------------|-------|
| Kleidung (€18) | €18.00 | €7.20 | 2.5x | €0.52 | €10.28 |
| Beauty (€28) | €28.00 | €11.20 | 2.5x | €0.81 | €15.99 |
| Instant Payout | — | — | — | 1.00% | — |
| Storfund (TikTok) | — | — | — | 0.1–0.2% | — |

**Break-even:** 1 Verkauf pro Tag = €300–450/Monat Netto nach allen Gebühren

---

## Entscheidungsbaum: TikTok Shop

```mermaid
flowchart TD
    A[Start TikTok Shop?] -->|Ja| B[€300–500 Startkapital?]
    B -->|Ja| C[Hybrid-Modell: Lagerbestand]
    B -->|Nein| D[Erst Eigen-Shop skalieren]
    C -->|6 Monate Umsatz| E[Storfund aktivieren]
    C -->|31 Tage warten| F[TikTok zahlt aus]
    D -->|Umsatz reinvestieren| G[Wieder bei B]
    E -->|80% sofort| H[Fast Cashflow]
    F -->|Geld da| I[Skalierung]
```

---

*Letzte Aktualisierung: 2026-05-27*
*Projekt: SIN-Webshop-01 / delqhi.com*
