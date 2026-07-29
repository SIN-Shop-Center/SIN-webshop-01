import { CircleAlert, FileCheck2, PackageCheck, ShieldCheck } from 'lucide-react'
import {
  approveProductForPublishing,
  rejectProduct,
  verifyProductGpsr,
} from '@/lib/actions/approvals/product'
import type { ApprovalProduct } from '@/lib/actions/approvals/types'
import { EmptyState, Field, SectionHeader, StatusPill } from './approval-ui'

export function ProductApprovalSection({ products }: { products: ApprovalProduct[] }) {
  return (
    <section className="rounded-2xl border border-border bg-card">
      <SectionHeader
        icon={PackageCheck}
        title="Produkt- und GPSR-Freigabe"
        description="Freigabe ist nur möglich, wenn Daten, Bestand, Quellen, Creative und Verantwortliche vollständig sind."
      />
      {products.length ? (
        <div className="divide-y divide-border">
          {products.map((product) => {
            const title = product.titleDe || product.name
            const blockers = product.publishBlockers
            return (
              <details key={product.id} className="group px-5 py-5 sm:px-6">
                <summary className="flex cursor-pointer list-none items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="truncate font-semibold tracking-tight">{title}</h3>
                      <StatusPill value={product.approvalState} />
                      <StatusPill value={product.creativeStatus} />
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Qualität {product.dataQualityScore}/100 · Bestand {product.stock} · Risiko {product.riskLevel}
                    </p>
                  </div>
                  <span className="shrink-0 text-xs text-muted-foreground group-open:hidden">Prüfen</span>
                </summary>

                <div className="mt-5 grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
                  <div className="space-y-4">
                    <div className="rounded-xl border border-border bg-muted/30 p-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">Readiness</p>
                      <dl className="mt-3 grid grid-cols-2 gap-3 text-xs">
                        <div><dt className="text-muted-foreground">Quellen</dt><dd className="mt-1 font-semibold">{product.researchSourceUrls.length}</dd></div>
                        <div><dt className="text-muted-foreground">Bilder</dt><dd className="mt-1 font-semibold">{new Set([...product.images, ...product.imageGallery]).size}</dd></div>
                        <div><dt className="text-muted-foreground">Pipeline</dt><dd className="mt-1 font-semibold">{product.pipelineState}</dd></div>
                        <div><dt className="text-muted-foreground">GPSR</dt><dd className="mt-1 font-semibold">{product.gpsrVerifiedAt ? 'geprüft' : 'offen'}</dd></div>
                      </dl>
                    </div>

                    {blockers.length ? (
                      <div className="rounded-xl border border-accent/20 bg-accent/5 p-4">
                        <div className="flex items-start gap-2">
                          <CircleAlert className="mt-0.5 size-4 shrink-0 text-accent" aria-hidden />
                          <div>
                            <p className="text-xs font-semibold">Gespeicherte Blocker</p>
                            <ul className="mt-2 space-y-1 text-xs leading-5 text-muted-foreground">
                              {blockers.map((blocker) => <li key={blocker}>{blocker}</li>)}
                            </ul>
                          </div>
                        </div>
                      </div>
                    ) : null}

                    <div className="flex flex-wrap gap-2">
                      <form action={approveProductForPublishing.bind(null, product.id)}>
                        <button className="btn btn-primary btn-md" type="submit">
                          <FileCheck2 className="size-4" aria-hidden />
                          Produkt freigeben
                        </button>
                      </form>
                      <form action={rejectProduct.bind(null, product.id)}>
                        <button className="btn btn-outline btn-md" type="submit">Ablehnen</button>
                      </form>
                    </div>
                  </div>

                  <form action={verifyProductGpsr} className="rounded-xl border border-border p-4 sm:p-5">
                    <input type="hidden" name="productId" value={product.id} />
                    <div className="flex items-start gap-3">
                      <ShieldCheck className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
                      <div>
                        <h4 className="text-sm font-semibold">Hersteller und EU-Verantwortlicher prüfen</h4>
                        <p className="mt-1 text-xs leading-5 text-muted-foreground">
                          Das Speichern bestätigt ausdrücklich, dass diese Angaben für genau dieses Produkt geprüft wurden.
                        </p>
                      </div>
                    </div>

                    <div className="mt-5 grid gap-5 lg:grid-cols-2">
                      <fieldset className="space-y-3">
                        <legend className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">Hersteller</legend>
                        <Field name="manufacturerName" label="Name" defaultValue={product.manufacturerName} required />
                        <Field name="manufacturerAddress" label="Adresse" defaultValue={product.manufacturerAddress} required />
                        <Field name="manufacturerEmail" label="E-Mail" defaultValue={product.manufacturerEmail} type="email" required />
                        <Field name="manufacturerPhone" label="Telefon" defaultValue={product.manufacturerPhone} />
                        <Field name="manufacturerSourceUrl" label="Beleg-URL" defaultValue={product.researchSourceUrls[0] || null} type="url" required />
                      </fieldset>
                      <fieldset className="space-y-3">
                        <legend className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">EU-Verantwortlicher</legend>
                        <Field name="responsiblePersonName" label="Name" defaultValue={product.responsiblePersonName} required />
                        <Field name="responsiblePersonCompany" label="Unternehmen" defaultValue={product.responsiblePersonCompany} />
                        <Field name="responsiblePersonAddress" label="Adresse" defaultValue={product.responsiblePersonAddress} required />
                        <Field name="responsiblePersonEmail" label="E-Mail" defaultValue={product.responsiblePersonEmail} type="email" required />
                        <Field name="responsiblePersonPhone" label="Telefon" defaultValue={product.responsiblePersonPhone} />
                        <Field name="responsiblePersonSourceUrl" label="Beleg-URL" defaultValue={product.researchSourceUrls[1] || product.researchSourceUrls[0] || null} type="url" required />
                      </fieldset>
                    </div>
                    <button className="btn btn-outline btn-md mt-5" type="submit">
                      <ShieldCheck className="size-4" aria-hidden />
                      Angaben als geprüft speichern
                    </button>
                  </form>
                </div>
              </details>
            )
          })}
        </div>
      ) : (
        <EmptyState text="Keine Produkte warten auf Freigabe." />
      )}
    </section>
  )
}
