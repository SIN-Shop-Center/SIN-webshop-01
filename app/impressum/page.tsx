// Purpose: Impressum page (Step 1; placeholder per plan, see PLAN-VERKAUFSFAEHIG.md)
// Docs: PLAN-VERKAUFSFAEHIG.md (issues #20-#26)

export default function ImpressumPage() {
  return (
    <div className="container mx-auto max-w-3xl px-4 py-12">
      <h1 className="mb-8 text-3xl font-bold">Impressum</h1>
      <div className="prose prose-slate">
        <p>SIN Shop Center GmbH</p>
        <p>
          Musterstraße 123
          <br />
          12345 Musterstadt
        </p>
        <p>E-Mail: info@sin-shop.example</p>
      </div>
    </div>
  )
}
