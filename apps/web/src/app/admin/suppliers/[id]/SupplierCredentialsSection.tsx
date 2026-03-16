import { KeyRound, Save } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'

type SupplierCredentialsSectionProps = {
  credentialsProvider: string
  credentialsUsername: string
  credentialsSecret: string
  credentialsMetadata: string
  hasSecret: boolean
  savingCredentials: boolean
  onProviderChange: (value: string) => void
  onUsernameChange: (value: string) => void
  onSecretChange: (value: string) => void
  onMetadataChange: (value: string) => void
  onSave: () => void
}

export function SupplierCredentialsSection(props: SupplierCredentialsSectionProps) {
  return (
    <section className="panel p-5">
      <div className="flex items-start gap-3">
        <span className="rounded-full bg-brand-bg-muted p-2 text-brand-text">
          <KeyRound className="h-4 w-4" />
        </span>
        <div>
          <h2 className="text-xl">Zugangsdaten</h2>
          <p className="mt-1 text-sm text-brand-text-muted">
            Nur das Nötigste für Portal- oder API-Zugang. Das Secret bleibt optional leer, wenn es bereits sicher hinterlegt wurde.
          </p>
        </div>
      </div>

      <div className="mt-4 grid gap-3">
        <Input
          label="Provider"
          value={props.credentialsProvider}
          onChange={(event) => props.onProviderChange(event.target.value)}
          placeholder="supplier_portal"
        />

        <Input
          label="Benutzername oder Login-Mail"
          value={props.credentialsUsername}
          onChange={(event) => props.onUsernameChange(event.target.value)}
          placeholder="admin@supplier.com"
        />

        <Input
          label="Neues Secret"
          type="password"
          showPasswordToggle
          value={props.credentialsSecret}
          onChange={(event) => props.onSecretChange(event.target.value)}
          placeholder={props.hasSecret ? 'Bereits hinterlegt' : 'Noch nicht gesetzt'}
          hint={props.hasSecret ? 'Ein vorhandenes Secret bleibt erhalten, wenn dieses Feld leer bleibt.' : undefined}
        />

        <details className="rounded-2xl border border-brand-border bg-brand-bg-muted px-4 py-3">
          <summary className="cursor-pointer text-sm font-semibold text-brand-text">Erweiterte Metadaten</summary>
          <textarea
            value={props.credentialsMetadata}
            onChange={(event) => props.onMetadataChange(event.target.value)}
            className="mt-3 h-28 w-full rounded-xl border border-brand-border bg-white px-3 py-2 font-mono text-xs focus:border-brand-accent focus:outline-none"
          />
        </details>

        <Button leftIcon={<Save className="h-4 w-4" />} onClick={props.onSave} isLoading={props.savingCredentials}>
          Zugang speichern
        </Button>
      </div>
    </section>
  )
}
