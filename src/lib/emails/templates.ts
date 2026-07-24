import 'server-only'

import { itemsTable } from './order-items-table'
import {
  ctaButton,
  escapeHtml,
  formatAddress,
  internalUrl,
  safeExternalHttpsUrl,
  shortId,
  wrap,
} from './template-layout'
import type { OrderData, OrderItem, ShippingAddress } from './template-types'

const BRAND_GREEN = '#047857'
const TEXT_PRIMARY = '#111827'
const TEXT_SECONDARY = '#6b7280'

export function orderConfirmationHtml(order: OrderData): string {
  const content = `
    <h2 style="margin:0 0 4px;font-size:20px;color:${TEXT_PRIMARY}">Danke für deine Bestellung</h2>
    <p style="margin:0 0 20px;font-size:14px;color:${TEXT_SECONDARY}">Bestellreferenz: <strong style="color:${BRAND_GREEN}">${shortId(order.orderId)}</strong></p>
    ${itemsTable(order.items, order.totalCents, order.currency)}
    <h3 style="margin:20px 0 8px;font-size:14px;color:${TEXT_SECONDARY}">Lieferadresse</h3>
    <p style="margin:0;font-size:14px;color:${TEXT_PRIMARY};line-height:1.5">${formatAddress(order.shippingAddress)}</p>
    <p style="margin:20px 0 0;font-size:13px;color:${TEXT_SECONDARY};line-height:1.6">Die beim Checkout angezeigte Versandart und Lieferzeit sind für diese Bestellung maßgeblich. Über Änderungen informieren wir dich per E-Mail.</p>
    ${ctaButton('Bestellung verfolgen', internalUrl('/bestellung-verfolgen'))}`
  return wrap(content)
}

export function orderShippedHtml(order: OrderData, trackingUrl: string): string {
  const safeTrackingUrl = safeExternalHttpsUrl(trackingUrl)
  const content = `
    <h2 style="margin:0 0 4px;font-size:20px;color:${TEXT_PRIMARY}">Deine Bestellung wurde versendet</h2>
    <p style="margin:0 0 20px;font-size:14px;color:${TEXT_SECONDARY}">Bestellreferenz: <strong style="color:${BRAND_GREEN}">${shortId(order.orderId)}</strong></p>
    <p style="margin:16px 0;font-size:14px;color:${TEXT_PRIMARY};line-height:1.6">Die Bestellung wurde an den Versanddienstleister übergeben. Der aktuelle Status ist über den folgenden Link abrufbar.</p>
    ${ctaButton('Sendung verfolgen', safeTrackingUrl)}
    ${ctaButton('Bestelldaten öffnen', internalUrl('/bestellung-verfolgen'))}`
  return wrap(content)
}

export function orderDeliveredHtml(order: OrderData): string {
  const content = `
    <h2 style="margin:0 0 4px;font-size:20px;color:${TEXT_PRIMARY}">Deine Bestellung wurde als zugestellt gemeldet</h2>
    <p style="margin:0 0 20px;font-size:14px;color:${TEXT_SECONDARY}">Bestellreferenz: <strong style="color:${BRAND_GREEN}">${shortId(order.orderId)}</strong></p>
    <p style="margin:0 0 20px;font-size:14px;color:${TEXT_PRIMARY};line-height:1.6">Falls die Sendung nicht angekommen ist oder etwas nicht stimmt, kontaktiere uns bitte. Informationen zum Widerrufsrecht findest du in der verlinkten Widerrufsbelehrung.</p>
    ${ctaButton('Bestellung verfolgen', internalUrl('/bestellung-verfolgen'))}
    ${ctaButton('Kontakt aufnehmen', internalUrl('/kontakt'))}`
  return wrap(content)
}

export function welcomeHtml(userName: string): string {
  const greeting = userName.trim() ? `Hallo ${escapeHtml(userName.trim())},` : 'Hallo,'
  const content = `
    <h2 style="margin:0 0 8px;font-size:20px;color:${TEXT_PRIMARY}">Willkommen bei ShopSIN</h2>
    <p style="margin:0 0 20px;font-size:14px;color:${TEXT_PRIMARY};line-height:1.6">${greeting}<br/><br/>dein Konto wurde eingerichtet. Im Shop findest du Produktinformationen, Bestellübersichten und deine gespeicherten Einstellungen.</p>
    ${ctaButton('Produkte ansehen', internalUrl('/produkte'))}`
  return wrap(content)
}

export type { OrderData, OrderItem, ShippingAddress }
