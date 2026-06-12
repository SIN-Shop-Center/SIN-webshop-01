#!/usr/bin/env node
/**
 * Checkout-Debugger: Simuliert Warenkorb + Checkout auf der Live-Seite
 * und zeigt die exakte Fehlermeldung.
 *
 * Usage: node scripts/test-checkout.mjs
 * Env: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY
 */
import { chromium } from 'playwright'

const BASE_URL = 'https://shopsin.delqhi.com'

async function testCheckout() {
  console.log('🧪 Checkout-Test startet...')
  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage()

  try {
    // 1. Produktseite öffnen (erstes verfügbares Produkt)
    console.log('  → Lade Produktseite...')
    await page.goto(`${BASE_URL}/produkte`, { waitUntil: 'networkidle' })
    
    // Erstes Produkt finden und klicken
    const firstProduct = await page.locator('a[href^="/produkt/"]').first()
    if (!await firstProduct.isVisible().catch(() => false)) {
      console.error('❌ Keine Produkte gefunden!')
      await browser.close()
      process.exit(1)
    }
    
    console.log('  → Klicke erstes Produkt...')
    await firstProduct.click()
    await page.waitForLoadState('networkidle')
    
    // 2. Zum Warenkorb hinzufügen
    console.log('  → Suche "In den Warenkorb"-Button...')
    const addButton = page.locator('button:has-text("In den Warenkorb"), button:has-text("Add to Cart")').first()
    if (!await addButton.isVisible().catch(() => false)) {
      console.error('❌ Kein Warenkorb-Button gefunden!')
      await browser.close()
      process.exit(1)
    }
    
    console.log('  → Klicke "In den Warenkorb"...')
    await addButton.click()
    
    // Warte kurz für Toast/Confirmation
    await page.waitForTimeout(1500)
    
    // 3. Warenkorb öffnen
    console.log('  → Öffne Warenkorb...')
    await page.goto(`${BASE_URL}/warenkorb`, { waitUntil: 'networkidle' })
    
    // 4. Checkout starten
    console.log('  → Suche "Zur Kasse"-Button...')
    const checkoutButton = page.locator('button:has-text("Zur Kasse"), button:has-text("Checkout"), a:has-text("Zur Kasse")').first()
    if (!await checkoutButton.isVisible().catch(() => false)) {
      console.error('❌ Kein Checkout-Button im Warenkorb!')
      await browser.close()
      process.exit(1)
    }
    
    console.log('  → Klicke "Zur Kasse"...')
    
    // Fange alle console messages und errors
    const errors = []
    page.on('console', msg => {
      if (msg.type() === 'error') errors.push(`Console: ${msg.text()}`)
    })
    page.on('pageerror', err => errors.push(`PageError: ${err.message}`))
    
    await checkoutButton.click()
    await page.waitForTimeout(3000)
    
    // 5. Prüfe Ergebnis
    const url = page.url()
    console.log(`  → Aktuelle URL: ${url}`)
    
    if (url.includes('stripe.com') || url.includes('checkout.stripe')) {
      console.log('✅ ERFOLG: Weiterleitung zu Stripe!')
    } else if (url.includes('abgebrochen') || url.includes('cancel')) {
      console.log('⚠️ Checkout abgebrochen')
    } else {
      // Prüfe auf Fehlermeldung auf der Seite
      const errorText = await page.locator('text=/Fehler|error|nicht verfügbar/i').first().textContent().catch(() => null)
      if (errorText) {
        console.log(`❌ FEHLER auf Seite: "${errorText.trim()}"`)
      } else {
        console.log('❌ Keine Stripe-Weiterleitung. Mögliche Fehler:')
      }
    }
    
    if (errors.length > 0) {
      console.log('\n📋 Browser-Fehler:')
      errors.forEach(e => console.log(`  - ${e}`))
    }
    
  } catch (e) {
    console.error('❌ Test fehlgeschlagen:', e.message)
  } finally {
    await browser.close()
  }
}

testCheckout()
