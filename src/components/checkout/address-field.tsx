'use client'

import type { AddressFieldName } from './address-form-model'
import { ADDRESS_FIELD_LABELS } from './address-form-model'

export function AddressField({
  name,
  value,
  error,
  touched,
  onChange,
  onBlur,
  autoComplete,
  inputMode,
  maxLength,
}: {
  name: AddressFieldName
  value: string
  error?: string
  touched: boolean
  onChange: (value: string) => void
  onBlur: () => void
  autoComplete: string
  inputMode?: 'numeric'
  maxLength?: number
}) {
  return (
    <label className="field-label">
      {ADDRESS_FIELD_LABELS[name]}
      <input
        type="text"
        className="field-input"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onBlur={onBlur}
        autoComplete={autoComplete}
        inputMode={inputMode}
        maxLength={maxLength}
      />
      {touched && error ? <span className="text-xs text-destructive">{error}</span> : null}
    </label>
  )
}
