export async function addToCartClient(productId: string, quantity = 1, variantId?: string) {
  const response = await fetch('/api/cart', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ productId, quantity, variantId }),
  })
  const payload = await response.json()
  if (!response.ok) throw new Error(payload.error || 'Warenkorb konnte nicht geändert werden.')
}
