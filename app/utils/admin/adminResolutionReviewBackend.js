import { supabase } from '../../../supabaseClient'
import { REPORT_SELECT, mapReportRow } from '../shared/reportQuery'

const RESOLUTION_COMPARE_SELECT = `
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
    report_attachments ( id, image_url )
  )
`

export async function getResolutionCompareData(resolutionId) {
  if (!resolutionId) throw new Error('resolutionId is required')

  const { data, error } = await supabase
    .from('report_resolutions')
    .select(RESOLUTION_COMPARE_SELECT)
    .eq('id', resolutionId)
    .single()

  if (error) throw error

  const reportRow = data.reports
  const report = reportRow
    ? {
        ...mapReportRow(reportRow),
        attachments: reportRow.report_attachments || [],
      }
    : null

  const { data: extraImages } = await supabase
    .from('resolution_attachments')
    .select('id, image_url')
    .eq('resolution_id', resolutionId)

  return {
    id: data.id,
    report_id: data.report_id,
    notes: data.notes,
    image_url: data.image_url,
    latitude: data.latitude,
    longitude: data.longitude,
    status: data.status,
    created_at: data.created_at,
    volunteer_name: data.users?.full_name || 'Volunteer',
    resolution_images: [
      data.image_url,
      ...(extraImages || []).map((a) => a.image_url),
    ].filter(Boolean),
    report,
  }
}

export async function startResolutionReview(resolutionId) {
  if (!resolutionId) throw new Error('resolutionId is required')

  const { data: resolution, error: fetchError } = await supabase
    .from('report_resolutions')
    .select('id, report_id, status')
    .eq('id', resolutionId)
    .single()

  if (fetchError) throw fetchError
  if (!resolution) throw new Error('Resolution not found')
  if (resolution.status !== 'pending') {
    throw new Error('Only pending resolutions can be moved to review.')
  }

  const { error: resolutionError } = await supabase
    .from('report_resolutions')
    .update({ status: 'under_review' })
    .eq('id', resolutionId)
    .eq('status', 'pending')

  if (resolutionError) throw resolutionError

  const { error: reportError } = await supabase
    .from('reports')
    .update({ status: 'under_review' })
    .eq('id', resolution.report_id)

  if (reportError) throw reportError
}

export async function markResolutionResolved(resolutionId) {
  if (!resolutionId) throw new Error('resolutionId is required')

  const { data: resolution, error: fetchError } = await supabase
    .from('report_resolutions')
    .select('id, report_id, status')
    .eq('id', resolutionId)
    .single()

  if (fetchError) throw fetchError
  if (!resolution) throw new Error('Resolution not found')
  if (resolution.status !== 'under_review') {
    throw new Error('Resolution must be in review before it can be marked resolved.')
  }

  const { error: resolutionError } = await supabase
    .from('report_resolutions')
    .update({ status: 'approved' })
    .eq('id', resolutionId)
    .eq('status', 'under_review')

  if (resolutionError) throw resolutionError

  const { error: reportError } = await supabase
    .from('reports')
    .update({ status: 'resolved' })
    .eq('id', resolution.report_id)

  if (reportError) throw reportError
}
