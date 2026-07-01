function withPrefix(value, prefix) {
  if (!value) return null
  const text = String(value).trim()
  if (!text) return null
  const pattern = new RegExp(`^${prefix}\\s`, 'i')
  return pattern.test(text) ? text : `${prefix} ${text}`
}

/**
 * Formats location like the report summary:
 * Purok X, Street, Barangay Y, City
 */
export function formatLocationAddress({
  purok = null,
  street = null,
  barangay = null,
  city = null,
  subregion = null,
  location_text = null,
  formatted_address = null,
  formattedAddress = null,
  latitude = null,
  longitude = null,
} = {}) {
  const segments = [
    withPrefix(purok, 'Purok'),
    street?.trim() || null,
    withPrefix(barangay, 'Barangay'),
    city?.trim() || subregion?.trim() || null,
  ].filter(Boolean)

  if (segments.length > 0) return segments.join(', ')

  const stored = location_text || formatted_address || formattedAddress
  if (stored?.trim()) return stored.trim()

  if (latitude != null && longitude != null) {
    return `${latitude}, ${longitude}`
  }

  return 'Unknown location'
}

export function buildLocationText(fields = {}) {
  return formatLocationAddress(fields)
}
