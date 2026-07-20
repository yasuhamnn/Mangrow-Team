import { supabase } from '../../supabaseClient'
import { REPORT_SELECT, mapReportRow } from './shared/reportQuery'

export async function getReportById(reportId) {
  if (!reportId) throw new Error('Report id is required')

  const { data, error } = await supabase
    .from('reports')
    .select(`${REPORT_SELECT}, report_attachments ( id, image_url, created_at )`)
    .eq('id', reportId)
    .maybeSingle()

  if (error) throw error
  if (!data) throw new Error('This report is no longer available.')

  const report = mapReportRow(data)
  return {
    ...report,
    attachments: data.report_attachments || [],
  }
}

export async function requestReportResolution(reportId, notes = null) {
  if (!reportId) throw new Error('Report id is required')

  const { error } = await supabase.rpc('request_report_resolution', {
    p_report_id: reportId,
    p_notes: notes,
  })

  if (error) throw error
}
