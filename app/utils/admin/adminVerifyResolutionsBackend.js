import { supabase } from '../../../supabaseClient'
import { REPORT_SELECT, mapReportRow } from '../shared/reportQuery'
import { formatLocationAddress } from '../shared/locationFormat'

const REPORT_RESOLUTIONS_TABLE = 'report_resolutions'
const LEGACY_RESOLUTIONS_TABLE = 'resolutions'

const RESOLUTION_SELECT = `
  id,
  report_id,
  user_id,
  notes,
  image_url,
  latitude,
  longitude,
  status,
  created_at,
  users ( full_name, avatar_url ),
  reports (
    ${REPORT_SELECT.trim()},
    report_attachments ( id, image_url ),
    users ( full_name, avatar_url )
  )
`

const LEGACY_RESOLUTION_SELECT = `
  id,
  report_id,
  user_id,
  description,
  image_url,
  latitude,
  longitude,
  status,
  created_at,
  users ( full_name, avatar_url ),
  reports (
    ${REPORT_SELECT.trim()},
    report_attachments ( id, image_url ),
    users ( full_name, avatar_url )
  )
`

function isMissingTableError(error, tableName) {
  const message = error?.message?.toLowerCase() || ''
  return message.includes('could not find the table')
    && (message.includes(tableName.toLowerCase()) || message.includes('schema cache'))
}

function mapResolutionRow(row) {
  if (!row) return null

  const reportRow = row.reports
  const report = reportRow
    ? {
        ...mapReportRow(reportRow),
        attachments: reportRow.report_attachments || [],
        volunteer_name: reportRow.users?.full_name || 'Volunteer',
        volunteer_avatar: reportRow.users?.avatar_url || null,
      }
    : null

  const notes = row.notes ?? row.description ?? null

  return {
    id: row.id,
    report_id: row.report_id,
    user_id: row.user_id,
    notes,
    image_url: row.image_url,
    latitude: row.latitude,
    longitude: row.longitude,
    status: row.status,
    created_at: row.created_at,
    captured_at: row.created_at,
    volunteer_name: row.users?.full_name || report?.volunteer_name || 'Volunteer',
    volunteer_avatar: row.users?.avatar_url || null,
    species: report?.species || 'Mangrove Report',
    formatted_address: report?.formatted_address
      || formatLocationAddress({ latitude: row.latitude, longitude: row.longitude }),
    health_status: report?.health_status || 'unhealthy',
    report,
    attachments: report?.attachments || [],
  }
}

async function queryPendingFromTable(tableName, selectQuery) {
  return supabase
    .from(tableName)
    .select(selectQuery)
    .in('status', ['pending', 'under_review'])
    .order('created_at', { ascending: false })
}

/** Pending volunteer resolution submissions (not general under_review reports). */
export async function getPendingResolutions() {
  let { data, error } = await queryPendingFromTable(REPORT_RESOLUTIONS_TABLE, RESOLUTION_SELECT)

  if (error && isMissingTableError(error, REPORT_RESOLUTIONS_TABLE)) {
    const legacy = await queryPendingFromTable(LEGACY_RESOLUTIONS_TABLE, LEGACY_RESOLUTION_SELECT)
    data = legacy.data
    error = legacy.error
  }

  if (error) throw error
  return (data || []).map(mapResolutionRow)
}

async function updateResolutionRow(tableName, resolutionId, payload) {
  return supabase
    .from(tableName)
    .update(payload)
    .eq('id', resolutionId)
}

async function fetchResolutionRow(tableName, resolutionId) {
  return supabase
    .from(tableName)
    .select('id, report_id, status')
    .eq('id', resolutionId)
    .single()
}

export async function submitResolutionVerificationDecision({ resolutionId, decision }) {
  if (!resolutionId) throw new Error('resolutionId is required')

  let tableName = REPORT_RESOLUTIONS_TABLE
  let { data: resolution, error: fetchError } = await fetchResolutionRow(tableName, resolutionId)

  if (fetchError && isMissingTableError(fetchError, REPORT_RESOLUTIONS_TABLE)) {
    tableName = LEGACY_RESOLUTIONS_TABLE
    const legacy = await fetchResolutionRow(tableName, resolutionId)
    resolution = legacy.data
    fetchError = legacy.error
  }

  if (fetchError) throw fetchError
  if (!resolution) throw new Error('Resolution not found')
  if (resolution.status !== 'pending') {
    throw new Error('This resolution has already been reviewed.')
  }

  if (decision === 'approved') {
    const { error: resolutionError } = await updateResolutionRow(tableName, resolutionId, {
      status: 'approved',
    })
    if (resolutionError) throw resolutionError

    const { error: reportError } = await supabase
      .from('reports')
      .update({ status: 'resolved' })
      .eq('id', resolution.report_id)

    if (reportError) throw reportError
    return
  }

  if (decision === 'rejected') {
    const { error } = await updateResolutionRow(tableName, resolutionId, { status: 'rejected' })
    if (error) throw error
    return
  }

  throw new Error(`Invalid decision "${decision}". Use approved or rejected.`)
}
