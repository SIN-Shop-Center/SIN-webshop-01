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

export type AddressFieldName =
  | 'firstName'
  | 'lastName'
  | 'street'
  | 'houseNumber'
  | 'zip'
  | 'city'

export type AddressErrors = Partial<Record<AddressFieldName, string>>

export const ADDRESS_FIELD_NAMES: AddressFieldName[] = [
  'firstName',
  'lastName',
  'street',
  'houseNumber',
  'zip',
  'city',
]

export const ADDRESS_FIELD_LABELS: Record<AddressFieldName, string> = {
  firstName: 'Vorname',
  lastName: 'Nachname',
  street: 'Straße',
  houseNumber: 'Hausnr.',
  zip: 'PLZ',
  city: 'Ort',
}

export const EMPTY_ADDRESS: AddressData = {
  firstName: '',
  lastName: '',
  street: '',
  houseNumber: '',
  zip: '',
  city: '',
  country: 'DE',
  saveAddress: false,
}

export function validateAddress(data: AddressData): AddressErrors {
  const errors: AddressErrors = {}
  if (!data.firstName.trim()) errors.firstName = 'Vorname ist erforderlich'
  if (!data.lastName.trim()) errors.lastName = 'Nachname ist erforderlich'
  if (!data.street.trim()) errors.street = 'Straße ist erforderlich'
  if (!data.houseNumber.trim()) errors.houseNumber = 'Hausnummer ist erforderlich'
  if (!data.zip.trim()) errors.zip = 'PLZ ist erforderlich'
  else if (!/^\d{5}$/.test(data.zip.trim())) errors.zip = 'PLZ muss 5 Ziffern haben'
  if (!data.city.trim()) errors.city = 'Ort ist erforderlich'
  return errors
}
