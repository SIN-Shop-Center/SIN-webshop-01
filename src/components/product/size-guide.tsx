'use client'

import { useState } from 'react'
import { ChevronDown, Ruler } from 'lucide-react'

const SHOE_SIZES = [
  { eu: '38', us: '6', uk: '5.5', cm: '24' },
  { eu: '39', us: '7', uk: '6', cm: '24.5' },
  { eu: '40', us: '7.5', uk: '6.5', cm: '25' },
  { eu: '41', us: '8', uk: '7', cm: '25.5' },
  { eu: '42', us: '8.5', uk: '7.5', cm: '26' },
  { eu: '43', us: '9.5', uk: '8.5', cm: '27' },
  { eu: '44', us: '10', uk: '9', cm: '27.5' },
  { eu: '45', us: '11', uk: '10', cm: '28' },
  { eu: '46', us: '12', uk: '11', cm: '29' },
]

const CLOTHING_SIZES = [
  { label: 'S', chest: '86–90', waist: '70–74', hip: '92–96' },
  { label: 'M', chest: '90–94', waist: '74–78', hip: '96–100' },
  { label: 'L', chest: '94–100', waist: '78–84', hip: '100–106' },
  { label: 'XL', chest: '100–106', waist: '84–90', hip: '106–112' },
  { label: 'XXL', chest: '106–112', waist: '90–96', hip: '112–118' },
]

const MEASURING_TIPS = [
  'Brustumfang: Maßband waagerecht um die breiteste Stelle der Brust führen.',
  'Taillenumfang: Maßband waagerecht um die schmalste Stelle der Taille führen.',
  'Hüftumfang: Maßband waagerecht um die breiteste Stelle der Hüfte führen.',
  'Fußlänge: Auf einem Blatt Papier stehen, Umrisse markieren und von Ferse bis längstem Zeh messen.',
]

export function SizeGuide() {
  const [open, setOpen] = useState(false)
  const [tab, setTab] = useState<'shoes' | 'clothing'>('shoes')
  const [measuringOpen, setMeasuringOpen] = useState(false)

  return (
    <div className="rounded-lg border border-border">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-2 px-4 py-3 text-sm font-medium text-foreground transition-colors hover:bg-muted/50"
      >
        <span className="flex items-center gap-2">
          <Ruler className="size-4 text-primary" aria-hidden />
          Größentabelle
        </span>
        <ChevronDown
          className={`size-4 shrink-0 text-muted-foreground transition-transform duration-200 ${
            open ? 'rotate-180' : ''
          }`}
          aria-hidden
        />
      </button>

      <div
        className={`grid transition-[grid-template-rows] duration-200 ${
          open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
        }`}
      >
        <div className="overflow-hidden">
          <div className="border-t border-border px-4 py-4">
            <div className="mb-4 flex gap-2">
              <button
                type="button"
                onClick={() => setTab('shoes')}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                  tab === 'shoes'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground hover:text-foreground'
                }`}
              >
                Schuhe
              </button>
              <button
                type="button"
                onClick={() => setTab('clothing')}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                  tab === 'clothing'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground hover:text-foreground'
                }`}
              >
                Bekleidung
              </button>
            </div>

            {tab === 'shoes' && (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border text-left text-muted-foreground">
                      <th className="pb-2 pr-3 font-medium">EU</th>
                      <th className="pb-2 pr-3 font-medium">US</th>
                      <th className="pb-2 pr-3 font-medium">UK</th>
                      <th className="pb-2 font-medium">CM</th>
                    </tr>
                  </thead>
                  <tbody>
                    {SHOE_SIZES.map((row) => (
                      <tr key={row.eu} className="border-b border-border/50 last:border-0">
                        <td className="py-1.5 pr-3 font-medium">{row.eu}</td>
                        <td className="py-1.5 pr-3">{row.us}</td>
                        <td className="py-1.5 pr-3">{row.uk}</td>
                        <td className="py-1.5">{row.cm}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {tab === 'clothing' && (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border text-left text-muted-foreground">
                      <th className="pb-2 pr-3 font-medium">Größe</th>
                      <th className="pb-2 pr-3 font-medium">Brust (cm)</th>
                      <th className="pb-2 pr-3 font-medium">Taille (cm)</th>
                      <th className="pb-2 font-medium">Hüfte (cm)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {CLOTHING_SIZES.map((row) => (
                      <tr key={row.label} className="border-b border-border/50 last:border-0">
                        <td className="py-1.5 pr-3 font-medium">{row.label}</td>
                        <td className="py-1.5 pr-3">{row.chest}</td>
                        <td className="py-1.5 pr-3">{row.waist}</td>
                        <td className="py-1.5">{row.hip}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="mt-4">
              <button
                type="button"
                onClick={() => setMeasuringOpen(!measuringOpen)}
                aria-expanded={measuringOpen}
                className="flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
              >
                <ChevronDown
                  className={`size-3 transition-transform duration-200 ${
                    measuringOpen ? 'rotate-180' : ''
                  }`}
                  aria-hidden
                />
                Wie messe ich richtig?
              </button>

              <div
                className={`grid transition-[grid-template-rows] duration-200 ${
                  measuringOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
                }`}
              >
                <div className="overflow-hidden">
                  <ul className="mt-2 space-y-1.5 pl-1 text-xs text-muted-foreground">
                    {MEASURING_TIPS.map((tip) => (
                      <li key={tip} className="list-disc pl-3">
                        {tip}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
