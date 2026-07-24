// Purpose: Shipping address form — German fields, validation, save checkbox

'use client'

import { useState } from 'react'
import { MapPinIcon } from 'lucide-react'
import { AddressField } from './address-field'
import {
  ADDRESS_FIELD_NAMES,
  EMPTY_ADDRESS,
  validateAddress,
  type AddressData,
  type AddressErrors,
  type AddressFieldName,
} from './address-form-model'

export type { AddressData } from './address-form-model'

export function AddressForm({
  onChange,
  onSubmit,
}: {
  onChange: (data: AddressData) => void
  onSubmit: (data: AddressData) => void
}) {
  const [form, setForm] = useState<AddressData>(EMPTY_ADDRESS)
  const [errors, setErrors] = useState<AddressErrors>({})
  const [touched, setTouched] = useState<Set<AddressFieldName>>(new Set())

  function update(partial: Partial<AddressData>) {
    const next = { ...form, ...partial }
    setForm(next)
    onChange(next)
  }

  function blur(field: AddressFieldName) {
    setTouched((current) => new Set(current).add(field))
    setErrors(validateAddress(form))
  }

  function submit(event: React.FormEvent) {
    event.preventDefault()
    const nextErrors = validateAddress(form)
    setTouched(new Set(ADDRESS_FIELD_NAMES))
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length === 0) onSubmit(form)
  }

  const field = (
    name: AddressFieldName,
    autoComplete: string,
    options?: { inputMode?: 'numeric'; maxLength?: number },
  ) => (
    <AddressField
      name={name}
      value={form[name]}
      error={errors[name]}
      touched={touched.has(name)}
      onChange={(value) => update({ [name]: value })}
      onBlur={() => blur(name)}
      autoComplete={autoComplete}
      {...options}
    />
  )

  return (
    <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
      <h3 className="flex items-center gap-2 text-lg font-semibold">
        <MapPinIcon className="size-5" aria-hidden /> Lieferadresse
      </h3>

      <div className="grid gap-4 sm:grid-cols-2">
        {field('firstName', 'given-name')}
        {field('lastName', 'family-name')}
      </div>
      <div className="grid gap-4 sm:grid-cols-[1fr_7rem]">
        {field('street', 'address-line1')}
        {field('houseNumber', 'address-line2')}
      </div>
      <div className="grid gap-4 sm:grid-cols-[8rem_1fr]">
        {field('zip', 'postal-code', { inputMode: 'numeric', maxLength: 5 })}
        {field('city', 'address-level2')}
      </div>

      <label className="field-label">
        Land
        <select className="field-input" value={form.country} onChange={(event) => update({ country: event.target.value })} autoComplete="country">
          <option value="DE">Deutschland</option>
          <option value="AT">Österreich</option>
          <option value="CH">Schweiz</option>
        </select>
      </label>

      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={form.saveAddress} onChange={(event) => update({ saveAddress: event.target.checked })} className="size-4 rounded border-border accent-[#047857]" />
        Adresse speichern
      </label>

      <button type="submit" className="btn btn-primary btn-lg w-full sm:w-auto">Weiter zur Versandart</button>
    </form>
  )
}
