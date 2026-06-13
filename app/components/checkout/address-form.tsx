// Purpose: Shipping address form — German fields, validation, save checkbox
// Docs: PLAN-VERKAUFSFAEHIG.md

'use client'

import { useState } from 'react'
import { MapPinIcon } from 'lucide-react'

export interface AddressData {
  firstName: string
  lastName: string
  street: string
  houseNumber: string
  zip: string
  city: string
  country: string
  saveAddress: boolean
}

interface FieldError {
  firstName?: string
  lastName?: string
  street?: string
  houseNumber?: string
  zip?: string
  city?: string
}

const FIELD_LABELS: Record<string, string> = {
  firstName: 'Vorname',
  lastName: 'Nachname',
  street: 'Straße',
  houseNumber: 'Hausnr.',
  zip: 'PLZ',
  city: 'Ort',
}

function validate(data: Omit<AddressData, 'saveAddress'>): FieldError {
  const e: FieldError = {}
  if (!data.firstName.trim()) e.firstName = 'Vorname ist erforderlich'
  if (!data.lastName.trim()) e.lastName = 'Nachname ist erforderlich'
  if (!data.street.trim()) e.street = 'Straße ist erforderlich'
  if (!data.houseNumber.trim())
    e.houseNumber = 'Hausnummer ist erforderlich'
  if (!data.zip.trim()) e.zip = 'PLZ ist erforderlich'
  else if (!/^\d{5}$/.test(data.zip.trim()))
    e.zip = 'PLZ muss 5 Ziffern haben'
  if (!data.city.trim()) e.city = 'Ort ist erforderlich'
  return e
}

export function AddressForm({
  onChange,
  onSubmit,
}: {
  onChange: (data: AddressData) => void
  onSubmit: (data: AddressData) => void
}) {
  const [form, setForm] = useState<AddressData>({
    firstName: '',
    lastName: '',
    street: '',
    houseNumber: '',
    zip: '',
    city: '',
    country: 'DE',
    saveAddress: false,
  })
  const [errors, setErrors] = useState<FieldError>({})
  const [touched, setTouched] = useState<Set<string>>(new Set())

  function update(partial: Partial<AddressData>) {
    const next = { ...form, ...partial }
    setForm(next)
    onChange(next)
  }

  function handleBlur(field: string) {
    const next = new Set(touched)
    next.add(field)
    setTouched(next)
    setErrors(validate(form))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const allTouched = new Set(Object.keys(FIELD_LABELS))
    setTouched(allTouched)
    const v = validate(form)
    setErrors(v)
    if (Object.keys(v).length === 0) {
      onSubmit(form)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
      <h3 className="flex items-center gap-2 text-lg font-semibold">
        <MapPinIcon className="size-5" aria-hidden />
        Lieferadresse
      </h3>

      {/* ── Name row ──────────────────────────────────────────────── */}
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="field-label">
          {FIELD_LABELS.firstName}
          <input
            type="text"
            className="field-input"
            value={form.firstName}
            onChange={(e) => update({ firstName: e.target.value })}
            onBlur={() => handleBlur('firstName')}
            autoComplete="given-name"
          />
          {touched.has('firstName') && errors.firstName && (
            <span className="text-xs text-destructive">{errors.firstName}</span>
          )}
        </label>
        <label className="field-label">
          {FIELD_LABELS.lastName}
          <input
            type="text"
            className="field-input"
            value={form.lastName}
            onChange={(e) => update({ lastName: e.target.value })}
            onBlur={() => handleBlur('lastName')}
            autoComplete="family-name"
          />
          {touched.has('lastName') && errors.lastName && (
            <span className="text-xs text-destructive">{errors.lastName}</span>
          )}
        </label>
      </div>

      {/* ── Street + house number ──────────────────────────────────── */}
      <div className="grid gap-4 sm:grid-cols-[1fr_7rem]">
        <label className="field-label">
          {FIELD_LABELS.street}
          <input
            type="text"
            className="field-input"
            value={form.street}
            onChange={(e) => update({ street: e.target.value })}
            onBlur={() => handleBlur('street')}
            autoComplete="address-line1"
          />
          {touched.has('street') && errors.street && (
            <span className="text-xs text-destructive">{errors.street}</span>
          )}
        </label>
        <label className="field-label">
          {FIELD_LABELS.houseNumber}
          <input
            type="text"
            className="field-input"
            value={form.houseNumber}
            onChange={(e) => update({ houseNumber: e.target.value })}
            onBlur={() => handleBlur('houseNumber')}
            autoComplete="address-line2"
          />
          {touched.has('houseNumber') && errors.houseNumber && (
            <span className="text-xs text-destructive">
              {errors.houseNumber}
            </span>
          )}
        </label>
      </div>

      {/* ── ZIP + city ────────────────────────────────────────────── */}
      <div className="grid gap-4 sm:grid-cols-[8rem_1fr]">
        <label className="field-label">
          {FIELD_LABELS.zip}
          <input
            type="text"
            className="field-input"
            value={form.zip}
            onChange={(e) => update({ zip: e.target.value })}
            onBlur={() => handleBlur('zip')}
            autoComplete="postal-code"
            inputMode="numeric"
            maxLength={5}
          />
          {touched.has('zip') && errors.zip && (
            <span className="text-xs text-destructive">{errors.zip}</span>
          )}
        </label>
        <label className="field-label">
          {FIELD_LABELS.city}
          <input
            type="text"
            className="field-input"
            value={form.city}
            onChange={(e) => update({ city: e.target.value })}
            onBlur={() => handleBlur('city')}
            autoComplete="address-level2"
          />
          {touched.has('city') && errors.city && (
            <span className="text-xs text-destructive">{errors.city}</span>
          )}
        </label>
      </div>

      {/* ── Country ───────────────────────────────────────────────── */}
      <label className="field-label">
        Land
        <select
          className="field-input"
          value={form.country}
          onChange={(e) => update({ country: e.target.value })}
          autoComplete="country"
        >
          <option value="DE">Deutschland</option>
          <option value="AT">Österreich</option>
          <option value="CH">Schweiz</option>
        </select>
      </label>

      {/* ── Save address ──────────────────────────────────────────── */}
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={form.saveAddress}
          onChange={(e) => update({ saveAddress: e.target.checked })}
          className="size-4 rounded border-border accent-[#047857]"
        />
        Adresse speichern
      </label>

      <button type="submit" className="btn btn-primary btn-lg w-full sm:w-auto">
        Weiter zur Versandart
      </button>
    </form>
  )
}
