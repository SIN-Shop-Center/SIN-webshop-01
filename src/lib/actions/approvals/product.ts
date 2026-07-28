'use server'

import { revalidatePath } from 'next/cache'
import { requireAdmin } from '@/lib/admin-guard'
import { createAdminClient, createPublicAdminClient } from '@/lib/supabase/admin'
import { asStrings, asVariants, requiredHttpsUrl, requiredText, validEmail } from './shared'
import type { ApprovalProduct } from './types'

const MIN_QUALITY = 80

function currentBlockers(product: ApprovalProduct): string[] {
  const blockers: string[] = []
  const title = (product.titleDe || product.name || '').trim()
  const description = (product.descriptionDe || product.description || '').trim()
  const images = [...new Set([...product.images, ...product.imageGallery])]

  if (title.length < 10) blockers.push('Produkttitel zu kurz')
  if (description.length < 300) blockers.push('Produktbeschreibung zu kurz')
  if (product.price <= 0) blockers.push('Ungültiger Preis')
  if (product.stock <= 0) blockers.push('Kein Bestand')
  if (images.length < 4) blockers.push('Weniger als vier Produktbilder')
  if (!product.variants.some((variant) => Number(variant.stock || 0) > 0)) blockers.push('Keine kaufbare Variante')
  if (product.dataQualityScore < MIN_QUALITY) blockers.push(`Datenqualität unter ${MIN_QUALITY}`)
  if (!['low', 'medium'].includes(product.riskLevel)) blockers.push(`Risiko-Level ${product.riskLevel}`)
  if (product.researchSourceUrls.length < 2) blockers.push('Zu wenige Recherchequellen')
  if (product.creativeStatus !== 'approved') blockers.push('Creative nicht freigegeben')
  if (!product.manufacturerVerified) blockers.push('Hersteller nicht verifiziert')
  if (!product.responsiblePersonVerified) blockers.push('EU-Verantwortlicher nicht verifiziert')
  if (!product.gpsrVerifiedAt) blockers.push('GPSR-Prüfzeitpunkt fehlt')
  if (!product.manufacturerName || !product.manufacturerAddress || !product.manufacturerEmail) {
    blockers.push('Herstellerdaten unvollständig')
  }
  if (!product.responsiblePersonName || !product.responsiblePersonAddress || !product.responsiblePersonEmail) {
    blockers.push('EU-Verantwortlichen-Daten unvollständig')
  }
  return [...new Set(blockers)]
}

async function readProduct(productId: string): Promise<ApprovalProduct | null> {
  const shop = createAdminClient()
  const { data, error } = await shop
    .from('products')
    .select('id, name, title_de, description, description_de, price, stock, images, image_gallery, variants, pipeline_state, approval_state, creative_status, data_quality_score, risk_level, publish_blockers, research_source_urls, manufacturer_name, manufacturer_address, manufacturer_email, manufacturer_phone, manufacturer_verified, responsible_person_name, responsible_person_company, responsible_person_address, responsible_person_email, responsible_person_phone, responsible_person_verified, gpsr_verified_at')
    .eq('id', productId)
    .maybeSingle()
  if (error) throw error
  if (!data) return null

  return {
    id: data.id,
    name: data.name ?? '',
    titleDe: data.title_de ?? '',
    description: data.description ?? '',
    descriptionDe: data.description_de,
    price: Number(data.price || 0),
    stock: Number(data.stock || 0),
    images: asStrings(data.images),
    imageGallery: asStrings(data.image_gallery),
    variants: asVariants(data.variants),
    pipelineState: data.pipeline_state ?? 'legacy',
    approvalState: data.approval_state ?? 'review_required',
    creativeStatus: data.creative_status ?? 'missing',
    dataQualityScore: Number(data.data_quality_score || 0),
    riskLevel: data.risk_level ?? 'unknown',
    publishBlockers: asStrings(data.publish_blockers),
    researchSourceUrls: asStrings(data.research_source_urls),
    manufacturerName: data.manufacturer_name,
    manufacturerAddress: data.manufacturer_address,
    manufacturerEmail: data.manufacturer_email,
    manufacturerPhone: data.manufacturer_phone,
    manufacturerVerified: Boolean(data.manufacturer_verified),
    responsiblePersonName: data.responsible_person_name,
    responsiblePersonCompany: data.responsible_person_company,
    responsiblePersonAddress: data.responsible_person_address,
    responsiblePersonEmail: data.responsible_person_email,
    responsiblePersonPhone: data.responsible_person_phone,
    responsiblePersonVerified: Boolean(data.responsible_person_verified),
    gpsrVerifiedAt: data.gpsr_verified_at,
  }
}

export async function verifyProductGpsr(formData: FormData) {
  await requireAdmin()
  const shop = createAdminClient()
  const control = createPublicAdminClient()
  const productId = requiredText(formData, 'productId')
  const manufacturerEmail = requiredText(formData, 'manufacturerEmail')
  const responsiblePersonEmail = requiredText(formData, 'responsiblePersonEmail')
  const manufacturerSourceUrl = requiredHttpsUrl(formData, 'manufacturerSourceUrl')
  const responsiblePersonSourceUrl = requiredHttpsUrl(formData, 'responsiblePersonSourceUrl')
  if (!validEmail(manufacturerEmail) || !validEmail(responsiblePersonEmail)) {
    throw new Error('Ungültige E-Mail-Adresse')
  }

  const { data: existing, error: existingError } = await shop
    .from('products')
    .select('research_source_urls')
    .eq('id', productId)
    .maybeSingle()
  if (existingError) throw existingError
  if (!existing) throw new Error('Produkt nicht gefunden')

  const sourceUrls = [...new Set([
    ...asStrings(existing.research_source_urls),
    manufacturerSourceUrl,
    responsiblePersonSourceUrl,
  ])]
  const now = new Date().toISOString()
  const { error } = await shop
    .from('products')
    .update({
      manufacturer_name: requiredText(formData, 'manufacturerName'),
      manufacturer_address: requiredText(formData, 'manufacturerAddress'),
      manufacturer_email: manufacturerEmail,
      manufacturer_phone: String(formData.get('manufacturerPhone') || '').trim() || null,
      manufacturer_verified: true,
      responsible_person_name: requiredText(formData, 'responsiblePersonName'),
      responsible_person_company: String(formData.get('responsiblePersonCompany') || '').trim() || null,
      responsible_person_address: requiredText(formData, 'responsiblePersonAddress'),
      responsible_person_email: responsiblePersonEmail,
      responsible_person_phone: String(formData.get('responsiblePersonPhone') || '').trim() || null,
      responsible_person_verified: true,
      gpsr_verified_at: now,
      research_source_urls: sourceUrls,
      updated_at: now,
    })
    .eq('id', productId)
  if (error) throw error

  const sourceRows = [
    {
      product_id: productId,
      source_url: manufacturerSourceUrl,
      source_type: manufacturerSourceUrl === responsiblePersonSourceUrl ? 'gpsr' : 'manufacturer',
      source_title: 'Manuell geprüfte Herstellerquelle',
      extracted_data: { verified_by_admin: true, verified_at: now },
      confidence: 100,
      status: 'active',
      checked_at: now,
    },
    ...(manufacturerSourceUrl === responsiblePersonSourceUrl ? [] : [{
      product_id: productId,
      source_url: responsiblePersonSourceUrl,
      source_type: 'responsible_person',
      source_title: 'Manuell geprüfte EU-Verantwortlichenquelle',
      extracted_data: { verified_by_admin: true, verified_at: now },
      confidence: 100,
      status: 'active',
      checked_at: now,
    }]),
  ]
  const { error: sourceError } = await control
    .from('product_research_sources')
    .upsert(sourceRows, { onConflict: 'product_id,source_url' })
  if (sourceError) throw sourceError

  revalidatePath('/admin/freigaben')
  revalidatePath('/admin/produkte')
}

export async function approveProductForPublishing(productId: string): Promise<void> {
  await requireAdmin()
  const product = await readProduct(productId)
  if (!product) throw new Error('Produkt nicht gefunden')
  const blockers = currentBlockers(product)
  const shop = createAdminClient()

  if (blockers.length) {
    await shop.from('products').update({ publish_blockers: blockers, is_active: false }).eq('id', productId)
    revalidatePath('/admin/freigaben')
    throw new Error(blockers.join('; '))
  }

  const { error } = await shop
    .from('products')
    .update({
      approval_state: 'approved',
      pipeline_state: 'ready_to_publish',
      publish_blockers: [],
      is_active: false,
      updated_at: new Date().toISOString(),
    })
    .eq('id', productId)
  if (error) throw error

  revalidatePath('/admin/freigaben')
  revalidatePath('/admin/produkte')
}

export async function rejectProduct(productId: string) {
  await requireAdmin()
  const shop = createAdminClient()
  const { error } = await shop
    .from('products')
    .update({
      approval_state: 'rejected',
      pipeline_state: 'rejected',
      is_active: false,
      updated_at: new Date().toISOString(),
    })
    .eq('id', productId)
  if (error) throw error
  revalidatePath('/admin/freigaben')
  revalidatePath('/admin/produkte')
}
