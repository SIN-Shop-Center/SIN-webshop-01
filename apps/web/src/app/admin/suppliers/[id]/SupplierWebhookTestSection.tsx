import { Bug, Play, Zap } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import type { WebhookTestOutboundResult } from './types'

type SupplierWebhookTestSectionProps = {
  supplierID: string
  onTestInbound: (payload: Record<string, unknown>) => Promise<{ duplicate?: boolean; processed?: boolean }>
  onTestOutbound: (payload: Record<string, unknown>) => Promise<WebhookTestOutboundResult>
}

export function SupplierWebhookTestSection({
  supplierID,
  onTestInbound,
  onTestOutbound,
}: SupplierWebhookTestSectionProps) {
  const [inboundPayload, setInboundPayload] = useState('{\n  "event_id": "test_123",\n  "order_id": "order_uuid_here",\n  "status": "placed"\n}')
  const [outboundPayload, setOutboundPayload] = useState('{\n  "test": "heartbeat"\n}')
  
  const [testingInbound, setTestingInbound] = useState(false)
  const [testingOutbound, setTestingOutbound] = useState(false)
  
  const [inboundResult, setInboundResult] = useState<any>(null)
  const [outboundResult, setOutboundResult] = useState<WebhookTestOutboundResult | null>(null)

  const handleTestInbound = async () => {
    try {
      setTestingInbound(true)
      const res = await onTestInbound(JSON.parse(inboundPayload))
      setInboundResult(res)
    } catch (err: any) {
      setInboundResult({ error: err.message })
    } finally {
      setTestingInbound(false)
    }
  }

  const handleTestOutbound = async () => {
    try {
      setTestingOutbound(true)
      const res = await onTestOutbound(JSON.parse(outboundPayload))
      setOutboundResult(res)
    } catch (err: any) {
      setOutboundResult({ status: 0, body: '', response_time: '', error: err.message })
    } finally {
      setTestingOutbound(false)
    }
  }

  return (
    <section className="panel p-5 xl:col-span-2">
      <div className="flex items-start gap-3">
        <span className="rounded-full bg-brand-bg-muted p-2 text-brand-text">
          <Bug className="h-4 w-4" />
        </span>
        <div>
          <h2 className="text-xl">Webhook Tester</h2>
          <p className="mt-1 text-sm text-brand-text-muted">Simuliere eingehende Webhooks oder teste die Verbindung zum Supplier.</p>
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="space-y-4">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-brand-text">
            <Zap className="h-4 w-4 text-amber-500" />
            Inbound Simulator
          </h3>
          <p className="text-xs text-brand-text-muted">Testet die lokale Webhook-Verarbeitung inkl. Auth-Bypass (Admin-Session).</p>
          <textarea
            value={inboundPayload}
            onChange={(e) => setInboundPayload(e.target.value)}
            className="h-32 w-full rounded-xl border border-brand-border bg-brand-bg-muted px-3 py-2 font-mono text-xs focus:border-brand-accent focus:outline-none"
          />
          <Button leftIcon={<Play className="h-4 w-4" />} onClick={handleTestInbound} isLoading={testingInbound}>
            Simulieren
          </Button>
          {inboundResult ? (
            <pre className="mt-3 overflow-auto rounded-xl bg-brand-bg-subtle p-3 text-xs text-brand-text">
              {JSON.stringify(inboundResult, null, 2)}
            </pre>
          ) : null}
        </div>

        <div className="space-y-4">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-brand-text">
            <Zap className="h-4 w-4 text-emerald-500" />
            Outbound Connection
          </h3>
          <p className="text-xs text-brand-text-muted">Sendet einen echten Request an die Supplier-API (api_endpoint).</p>
          <textarea
            value={outboundPayload}
            onChange={(e) => setOutboundPayload(e.target.value)}
            className="h-32 w-full rounded-xl border border-brand-border bg-brand-bg-muted px-3 py-2 font-mono text-xs focus:border-brand-accent focus:outline-none"
          />
          <Button variant="outline" leftIcon={<Play className="h-4 w-4" />} onClick={handleTestOutbound} isLoading={testingOutbound}>
            Verbindung testen
          </Button>
          {outboundResult ? (
            <div className="mt-3 space-y-2 rounded-xl border border-brand-border bg-white p-3 text-xs">
              <div className="flex justify-between">
                <span className="font-semibold">Status:</span>
                <span className={outboundResult.status >= 400 ? 'text-red-600' : 'text-emerald-600'}>
                  {outboundResult.status || 'N/A'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="font-semibold">Zeit:</span>
                <span>{outboundResult.response_time}</span>
              </div>
              {outboundResult.error ? (
                <div className="text-red-600">Error: {outboundResult.error}</div>
              ) : (
                <div className="mt-1">
                  <p className="font-semibold">Body:</p>
                  <pre className="mt-1 max-h-40 overflow-auto rounded bg-brand-bg-muted p-2">
                    {outboundResult.body}
                  </pre>
                </div>
              )}
            </div>
          ) : null}
        </div>
      </div>
    </section>
  )
}
