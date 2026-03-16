import Link from '@/components/ui/Link'
import { ShieldCheck } from 'lucide-react'

type LoginPageMessagesProps = {
  urlError: string | null
  error: string | null
  urlMessage: string | null
  success: string | null
}

export function LoginPageMessages({ urlError, error, urlMessage, success }: LoginPageMessagesProps) {
  return (
    <>
      {urlError === 'auth_callback_failed' ? (
        <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">Anmeldelink ungültig oder abgelaufen. Bitte erneut anmelden.</p>
      ) : null}
      {urlError === 'auth_config_missing' ? (
        <p className="rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-800">
          Die Login-Konfiguration ist in dieser Umgebung noch nicht vollständig. Shop ist sichtbar, geschützte Bereiche bleiben bis zur finalen Auth-Konfiguration gesperrt.
        </p>
      ) : null}
      {error ? <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}
      {urlMessage === 'logged_out' ? (
        <p className="rounded-xl bg-brand-surface px-3 py-2 text-sm text-brand-text-muted">Du wurdest abgemeldet.</p>
      ) : null}
      {success ? <p className="rounded-xl bg-green-50 px-3 py-2 text-sm text-green-700">{success}</p> : null}
    </>
  )
}

export function LoginSecurityInfo() {
  return (
    <div className="mt-6 rounded-2xl border border-brand-border bg-brand-surface p-4 text-sm text-brand-text-muted">
      <p className="inline-flex items-center gap-2 font-semibold text-brand-text">
        <ShieldCheck className="h-4 w-4 text-brand-accent" />
        Rollenbasiert abgesichert
      </p>
      <p className="mt-1">
        Admin-Routen sind nur für Rollen <code>admin</code> oder <code>ops</code> freigeschaltet.
      </p>
      <p className="mt-3">
        Kein Zugriff? Zurück zur <Link href="/" className="font-semibold text-brand-accent hover:underline">Startseite</Link>.
      </p>
    </div>
  )
}
