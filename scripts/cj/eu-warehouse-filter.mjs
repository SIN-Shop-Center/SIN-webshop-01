// PATCH: In scripts/cj/import-products.mjs einfügen.
// Zweck: Nur Produkte mit EU/DE-Lagerbestand importieren (TikTok-Versandfristen!)
// Einbauort: nach dem Abruf der Produktvarianten, vor dem Supabase-Insert.

const EU_WAREHOUSES = ['DE', 'EU', 'GB', 'FR', 'ES', 'IT', 'PL', 'CZ'];

/**
 * Prüft via CJ Inventory API, ob eine Variante EU-Lagerbestand hat.
 * Endpoint: GET /api2.0/v1/product/stock/queryByVid?vid={vid}
 */
async function hasEuStock(accessToken, vid) {
  const res = await fetch(
    `https://developers.cjdropshipping.com/api2.0/v1/product/stock/queryByVid?vid=${encodeURIComponent(vid)}`,
    { headers: { 'CJ-Access-Token': accessToken } },
  );
  const json = await res.json();
  if (!json.result || !Array.isArray(json.data)) return false;

  return json.data.some(
    (w) =>
      EU_WAREHOUSES.includes(String(w.countryCode || w.areaEn || '').toUpperCase()) &&
      Number(w.storageNum ?? w.num ?? 0) > 0,
  );
}

// ── Verwendung in der Import-Schleife: ──
//
// const euStock = await hasEuStock(token, variant.vid);
// if (!euStock) {
//   console.log(`SKIP (kein EU-Lager): ${product.productNameEn}`);
//   continue;
// }
// row.tiktok_status = 'pending';
