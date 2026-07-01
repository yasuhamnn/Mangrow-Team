import { supabase } from '../../supabaseClient'
import { REPORT_SELECT, mapReportRow } from './shared/reportQuery'

export async function getReportRejectionFeedback(reportId) {
  if (!reportId) throw new Error('Report id is required')

  const { data: authData } = await supabase.auth.getUser()
  const userId = authData?.user?.id
  if (!userId) throw new Error('You must be signed in to view rejection feedback.')

  const { data, error } = await supabase
    .from('reports')
    .select(REPORT_SELECT)
    .eq('id', reportId)
    .eq('user_id', userId)
    .single()

  if (error) throw error
  if (data.status !== 'rejected') {
    throw new Error('This report is not in rejected status.')
  }

  const report = mapReportRow(data)
  return {
    ...report,
    rejection_category: data.rejection_category,
    rejection_reason: data.rejection_reason,
    rejected_at: data.rejected_at,
  }
}
