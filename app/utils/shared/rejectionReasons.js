export const REPORT_REJECTION_PRESETS = [
  { id: 'blurry_photo', label: 'Blurry or unclear photo' },
  { id: 'wrong_location', label: 'Location does not match mangrove area' },
  { id: 'wrong_species', label: 'Species could not be verified' },
  { id: 'duplicate', label: 'Duplicate report' },
  { id: 'insufficient_evidence', label: 'Insufficient evidence' },
  { id: 'other', label: 'Other (explain below)' },
]

export const RESOLUTION_REJECTION_PRESETS = [
  { id: 'unclear_proof', label: 'Resolution proof is unclear' },
  { id: 'wrong_area', label: 'Photos do not match reported area' },
  { id: 'issue_not_resolved', label: 'Issue does not appear resolved' },
  { id: 'other', label: 'Other (explain below)' },
]

export function buildRejectionMessage(category, customNote, presets = REPORT_REJECTION_PRESETS) {
  const preset = presets.find((p) => p.id === category)
  const label = preset?.label || 'Report rejected'
  const note = customNote?.trim()
  if (!note || category === 'other') {
    return note || label
  }
  return `${label}. ${note}`
}
