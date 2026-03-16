import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const payload = await req.json();
    const eventType = payload.eventType || payload.type;

    if (eventType === 'inventory_update' && payload.data) {
      const { sku, quantity, outOfStock } = payload.data;
      
      // Forward to internal API
      const backendUrl = process.env.INTERNAL_API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';
      const token = process.env.ADMIN_BEARER_TOKEN || 'dev-admin-token';
      
      const response = await fetch(`${backendUrl}/admin/inventory/reorder-scan`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          source: 'cj-dropshipping',
          updates: [{ sku, quantity, outOfStock }]
        })
      });

      if (!response.ok) {
        throw new Error(`Backend sync failed: ${response.status}`);
      }
    }

    return NextResponse.json({ received: true }, { status: 200 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
