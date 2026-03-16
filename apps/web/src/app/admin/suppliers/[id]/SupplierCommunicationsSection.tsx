import { Mail, SendHorizontal } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import type { SupplierCommunication } from './types'

type SupplierCommunicationsSectionProps = {
  communications: SupplierCommunication[]
  defaultRecipient?: string
  sendingCommunication: boolean
  onSendEmail: (to: string, subject: string, body: string, threadID?: string) => Promise<void>
}

type ThreadOption = {
  id: string
  label: string
}

function safeDateLabel(value?: string) {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'
  return date.toLocaleString('de-DE')
}

function newThreadID(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    try {
      return crypto.randomUUID()
    } catch {
    }
  }
  return `thread_${Date.now()}_${Math.random().toString(16).slice(2)}`
}

export function SupplierCommunicationsSection({
  communications,
  defaultRecipient,
  sendingCommunication,
  onSendEmail,
}: SupplierCommunicationsSectionProps) {
  const [to, setTo] = useState(defaultRecipient || '')
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [threadID, setThreadID] = useState('')

  useEffect(() => {
    if (!to && defaultRecipient) {
      setTo(defaultRecipient)
    }
  }, [defaultRecipient, to])

  const threadOptions = useMemo<ThreadOption[]>(() => {
    const seen = new Set<string>()
    const options: ThreadOption[] = []
    for (const item of communications) {
      const id = (item.thread_id || '').trim()
      if (!id || seen.has(id)) continue
      seen.add(id)
      const hint = item.subject ? item.subject.slice(0, 40) : item.recipient || item.sender || ''
      options.push({ id, label: hint ? `${id.slice(0, 8)}… - ${hint}` : `${id.slice(0, 8)}…` })
    }
    return options
  }, [communications])

  const sorted = useMemo(() => {
    return [...communications].sort((a, b) => {
      const at = a.created_at ? new Date(a.created_at).getTime() : 0
      const bt = b.created_at ? new Date(b.created_at).getTime() : 0
      return bt - at
    })
  }, [communications])

  const handleSend = async () => {
    const trimmedTo = to.trim()
    const trimmedBody = body.trim()
    if (!trimmedTo || !trimmedBody) return

    const chosenThread = threadID.trim() || newThreadID()
    await onSendEmail(trimmedTo, subject.trim(), trimmedBody, chosenThread)
    setSubject('')
    setBody('')
    setThreadID('')
  }

  return (
    <section className="panel p-5 xl:col-span-2">
      <div className="flex items-start gap-3">
        <span className="rounded-full bg-brand-bg-muted p-2 text-brand-text">
          <Mail className="h-4 w-4" />
        </span>
        <div>
          <h2 className="text-xl">Kommunikation</h2>
          <p className="mt-1 text-sm text-brand-text-muted">E-Mails und Notizen mit Thread-ID zur Nachverfolgung.</p>
        </div>
      </div>

      <div className="mt-4 grid gap-3">
        <Input label="Empfaenger" value={to} onChange={(event) => setTo(event.target.value)} placeholder="supplier@example.com" />

        <Input label="Betreff" value={subject} onChange={(event) => setSubject(event.target.value)} placeholder="(optional)" />

        <div className="w-full">
          <p className="mb-1.5 text-sm font-medium text-brand-text">Thread</p>
          <div className="grid gap-2 md:grid-cols-2">
            <select
              value={threadID}
              onChange={(event) => setThreadID(event.target.value)}
              className="w-full rounded-xl border border-brand-border bg-white px-3 py-2 text-sm focus:border-brand-accent focus:outline-none"
            >
              <option value="">Neue Konversation</option>
              {threadOptions.map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {opt.label}
                </option>
              ))}
            </select>
            <input
              value={threadID}
              onChange={(event) => setThreadID(event.target.value)}
              className="w-full rounded-xl border border-brand-border bg-white px-3 py-2 text-sm focus:border-brand-accent focus:outline-none"
              placeholder="Oder Thread-ID (auto)"
            />
          </div>
        </div>

        <label className="text-sm">
          Nachricht
          <textarea
            value={body}
            onChange={(event) => setBody(event.target.value)}
            className="mt-1 h-28 w-full rounded-xl border border-brand-border bg-white px-3 py-2 text-sm focus:border-brand-accent focus:outline-none"
            placeholder="Deine Nachricht..."
          />
        </label>

        <Button
          leftIcon={<SendHorizontal className="h-4 w-4" />}
          onClick={() => void handleSend()}
          isLoading={sendingCommunication}
          disabled={!to.trim() || !body.trim() || sendingCommunication}
        >
          E-Mail senden
        </Button>
      </div>

      <div className="mt-6 space-y-3">
        {sorted.map((item) => (
          <details key={item.id} className="rounded-2xl border border-brand-border bg-white px-4 py-3">
            <summary className="cursor-pointer list-none">
              <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-brand-text">
                    {item.direction} {item.channel}
                    {item.subject ? ` - ${item.subject}` : ''}
                  </p>
                  <p className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-brand-text-muted">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 font-medium ${
                        item.status === 'sent'
                          ? 'bg-emerald-50 text-emerald-700'
                          : item.status === 'failed'
                          ? 'bg-red-50 text-red-700'
                          : item.status === 'queued' || item.status === 'processing'
                          ? 'bg-amber-50 text-amber-800'
                          : 'bg-brand-bg-subtle text-brand-text-muted'
                      }`}
                    >
                      {item.status}
                    </span>
                    {item.thread_id ? <span>Thread: {item.thread_id.slice(0, 12)}…</span> : null}
                    {item.recipient ? <span>An: {item.recipient}</span> : null}
                    {item.sender ? <span>Von: {item.sender}</span> : null}
                    <span>{safeDateLabel(item.created_at)}</span>
                  </p>
                </div>
              </div>
            </summary>
            <div className="mt-3 whitespace-pre-wrap rounded-xl border border-brand-border bg-brand-bg-muted px-3 py-2 text-sm text-brand-text">
              {item.body}
            </div>
          </details>
        ))}

        {sorted.length === 0 ? (
          <p className="rounded-2xl border border-brand-border bg-brand-bg-muted px-4 py-4 text-sm text-brand-text-muted">
            Keine Kommunikation vorhanden.
          </p>
        ) : null}
      </div>
    </section>
  )
}
