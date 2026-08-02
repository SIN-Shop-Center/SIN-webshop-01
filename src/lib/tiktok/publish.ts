// Purpose: Governed ShopSIN product -> TikTok Shop listing orchestration
// Flow: verify gates -> upload approved images -> recommend category -> create listing

import 'server-only'

import {
  createAdminClient,
  createPublicAdminClient,
} from '@/lib/supabase/admin'
import {
  createTikTokProduct,
  getDefaultWarehouseId,
  recommendCategory,
  uploadProductImage,
} from '@/lib/tiktok/products'

import {
  asStringArray,
  buildDescription,
  calcTikTokPrice,
  MIN_QUALITY,
  TIKTOK_CURRENCY,
  TIKTOK_SAVE_MODE,
} from '@/lib/tiktok/publish-content'

export { calcTikTokPrice } from '@/lib/tiktok/publish-content'

export interface PublishResult {
  productId: string
  tiktokProductId?: string
  error?: string
}

export async function publishProductToTikTok(productId: string): Promise<PublishResult> {
  const shop = createAdminClient()
  const control = createPublicAdminClient()

  const { data: product, error: productError } = await shop
    .from('products')
    .select('id, name, title_de, description, description_de, price, stock, images, image_gallery, metadata, cj_cost_price, tiktok_product_id, pipeline_state, approval_state, creative_status, data_quality_score, risk_level, publish_blockers, manufacturer_name, manufacturer_verified, responsible_person_name, responsible_person_company, responsible_person_address, responsible_person_email, responsible_person_verified, gpsr_verified_at, is_active')
    .eq('id', productId)
    .maybeSingle()

  if (productError) return { productId, error: productError.message }
  if (!product) return { productId, error: 'Produkt nicht gefunden' }
  if (product.tiktok_product_id) {
    return { productId, tiktokProductId: product.tiktok_product_id }
  }

  const { data: creativeJob, error: creativeError } = await control
    .from('commerce_creative_jobs')
    .select('id, status, approval_state, render_path')
    .eq('product_id', productId)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (creativeError) return { productId, error: creativeError.message }

  const blockers: string[] = []
  const title = String(product.title_de || product.name || '').trim()
  const description = String(product.description_de || product.description || '').trim()
  const images = [...new Set([
    ...asStringArray(product.images),
    ...asStringArray(product.image_gallery),
  ])]

  if (!product.is_active || product.pipeline_state !== 'published') blockers.push('Produkt ist im Shop nicht veröffentlicht')
  if (product.approval_state !== 'approved') blockers.push('Produktfreigabe fehlt')
  if (product.creative_status !== 'approved') blockers.push('Creative-Freigabe fehlt')
  if (!creativeJob || creativeJob.status !== 'approved' || !creativeJob.render_path) blockers.push('Geprüftes Creative fehlt')
  if (Number(product.data_quality_score || 0) < MIN_QUALITY) blockers.push(`Datenqualität unter ${MIN_QUALITY}`)
  if (['unknown', 'high', 'blocked'].includes(String(product.risk_level))) blockers.push(`Risiko-Level ${product.risk_level}`)
  if (asStringArray(product.publish_blockers).length) blockers.push(...asStringArray(product.publish_blockers))
  if (!product.manufacturer_verified || !product.manufacturer_name) blockers.push('Hersteller nicht verifiziert')
  if (!product.responsible_person_verified || !product.gpsr_verified_at) blockers.push('EU-Verantwortlicher/GPSR nicht verifiziert')
  if (title.length < 10) blockers.push('Produkttitel unvollständig')
  if (description.length < 300) blockers.push('Produktbeschreibung unvollständig')
  if (Number(product.stock || 0) <= 0) blockers.push('Kein Bestand')
  if (images.length < 4) blockers.push('Zu wenige freigegebene Produktbilder')

  if (blockers.length) {
    const message = [...new Set(blockers)].join('; ')
    await shop
      .from('products')
      .update({ tiktok_status: 'blocked', tiktok_last_error: message })
      .eq('id', productId)
    return { productId, error: message }
  }

  await shop
    .from('products')
    .update({ tiktok_status: 'publishing', tiktok_last_error: null })
    .eq('id', productId)

  try {
    const metadata = product.metadata && typeof product.metadata === 'object' && !Array.isArray(product.metadata)
      ? product.metadata
      : {}
    const imageUris: string[] = []
    for (const imageUrl of images.slice(0, 9)) {
      imageUris.push(await uploadProductImage(imageUrl))
      await new Promise((resolve) => setTimeout(resolve, 300))
    }

    const categoryId = await recommendCategory({
      title,
      description,
      imageUri: imageUris[0],
    })
    const warehouseId = await getDefaultWarehouseId()
    const tiktokProductId = await createTikTokProduct({
      title,
      description: buildDescription({
        description,
        features: metadata.selling_points,
        specifications: metadata.specifications,
        manufacturerName: product.manufacturer_name,
        responsiblePersonName: product.responsible_person_name,
        responsiblePersonCompany: product.responsible_person_company,
        responsiblePersonAddress: product.responsible_person_address,
        responsiblePersonEmail: product.responsible_person_email,
      }),
      categoryId,
      imageUris,
      sellerSku: `SIN-${product.id}`,
      price: calcTikTokPrice(Number(product.cj_cost_price ?? 0), Number(product.price)),
      currency: TIKTOK_CURRENCY,
      quantity: Math.max(0, Number(product.stock ?? 0)),
      warehouseId,
      saveMode: TIKTOK_SAVE_MODE,
    })

    const now = new Date().toISOString()
    const tiktokStatus = TIKTOK_SAVE_MODE === 'LISTING' ? 'published' : 'draft'
    await shop
      .from('products')
      .update({
        tiktok_product_id: tiktokProductId,
        tiktok_status: tiktokStatus,
        tiktok_published_at: TIKTOK_SAVE_MODE === 'LISTING' ? now : null,
        tiktok_last_synced_at: now,
        tiktok_last_error: null,
      })
      .eq('id', productId)

    return { productId, tiktokProductId }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unbekannter TikTok-Fehler'
    await shop
      .from('products')
      .update({ tiktok_status: 'failed', tiktok_last_error: message })
      .eq('id', productId)
    return { productId, error: message }
  }
}
