// Purpose: Adressbuch-Verwaltung (Issue #55)

import { listAddresses, saveAddress, deleteAddress } from '@/lib/actions/account'

export const metadata = { title: 'Meine Adressen' }

export default async function AdressenPage() {
  const addresses = await listAddresses()

  return (
    <main className="container mx-auto flex max-w-2xl flex-col gap-8 px-4 py-8">
      <h1 className="text-2xl font-bold tracking-tight">Meine Adressen</h1>

      {addresses.length === 0 ? (
        <p className="text-sm text-muted-foreground">Noch keine Adresse gespeichert.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {addresses.map((a) => (
            <li
              key={a.id}
              className="flex items-start justify-between gap-4 rounded-lg border border-border bg-card p-4"
            >
              <div className="flex flex-col gap-1 text-sm">
                <span className="font-medium">
                  {a.label}
                  {a.is_default && (
                    <span className="ml-2 rounded bg-primary/10 px-1.5 py-0.5 text-xs text-primary">
                      Standard
                    </span>
                  )}
                </span>
                <span>{a.full_name}</span>
                <span className="text-muted-foreground">
                  {a.street}, {a.postal_code} {a.city}, {a.country}
                </span>
              </div>
              <form action={deleteAddress}>
                <input type="hidden" name="id" value={a.id} />
                <button type="submit" className="text-sm text-destructive underline">
                  Löschen
                </button>
              </form>
            </li>
          ))}
        </ul>
      )}

      <section className="flex flex-col gap-4 rounded-lg border border-border bg-card p-4">
        <h2 className="text-lg font-semibold">Neue Adresse</h2>
        <form action={saveAddress} className="flex flex-col gap-3">
          <input
            name="label"
            placeholder="Bezeichnung (z.B. Zuhause)"
            className="rounded-md border border-input bg-background px-3 py-2 text-sm"
          />
          <input
            name="full_name"
            required
            placeholder="Vor- und Nachname"
            className="rounded-md border border-input bg-background px-3 py-2 text-sm"
          />
          <input
            name="street"
            required
            placeholder="Straße und Hausnummer"
            className="rounded-md border border-input bg-background px-3 py-2 text-sm"
          />
          <div className="flex gap-3">
            <input
              name="postal_code"
              required
              placeholder="PLZ"
              className="w-28 rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
            <input
              name="city"
              required
              placeholder="Stadt"
              className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
          </div>
          <select
            name="country"
            className="rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            <option value="DE">Deutschland</option>
            <option value="AT">Österreich</option>
            <option value="CH">Schweiz</option>
          </select>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="is_default" /> Als Standardadresse festlegen
          </label>
          <button
            type="submit"
            className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 self-start"
          >
            Speichern
          </button>
        </form>
      </section>
    </main>
  )
}
