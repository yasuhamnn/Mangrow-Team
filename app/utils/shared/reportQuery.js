import { formatLocationAddress } from './locationFormat'

export const REPORT_SELECT = `
  id,
  user_id,
  species_id,
  image_url,
  health_status,
  latitude,
  longitude,
  location_text,
  field_notes,
  status,
  rejection_category,
  rejection_reason,
  rejected_at,
  created_at,
  mangrove_species ( name )
`

export function mapReportRow(row) {
  if (!row) return null

  const formatted_address = formatLocationAddress({
    location_text: row.location_text,
    latitude: row.latitude,
    longitude: row.longitude,
  })

  return {
    id: row.id,
    user_id: row.user_id,
    species_id: row.species_id,
    species: row.mangrove_species?.name ?? 'Unknown Species',
    image_url: row.image_url,
    health_status: row.health_status,
    latitude: row.latitude,
    longitude: row.longitude,
    location_text: row.location_text,
    field_notes: row.field_notes,
    status: row.status,
    report_status: row.status,
    rejection_category: row.rejection_category,
    rejection_reason: row.rejection_reason,
    rejected_at: row.rejected_at,
    created_at: row.created_at,
    formatted_address,
    notes: row.field_notes,
    captured_at: row.created_at,
  }
}

export function getStatusLabel(status) {
  if (status === 'pending') return 'Under Review'
  if (status === 'under_review') return 'Unresolved'
  if (status === 'resolved') return 'Resolved'
  if (status === 'rejected') return 'Rejected'
  if (status === 'recorded') return 'Recorded'
  return status?.charAt(0).toUpperCase() + status?.slice(1) || 'Unknown'
}
