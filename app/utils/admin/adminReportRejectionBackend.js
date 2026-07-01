import { supabase } from '../../../supabaseClient'
import { REPORT_SELECT, mapReportRow } from '../shared/reportQuery'
import { buildRejectionMessage, REPORT_REJECTION_PRESETS } from '../shared/rejectionReasons'

export async function getReportForRejection(reportId) {
  if (!reportId) throw new Error('reportId is required')

  const { data, error } = await supabase
    .from('reports')
    .select(`${REPORT_SELECT}, report_attachments ( id, image_url ), users ( full_name, avatar_url )`)
    .eq('id', reportId)
    .eq('status', 'pending')
    .single()

  if (error) throw error

  return {
    ...mapReportRow(data),
    attachments: data.report_attachments || [],
    volunteer_name: data.users?.full_name || 'Volunteer',
    volunteer_avatar: data.users?.avatar_url || null,
  }
}

export async function rejectReportWithReason({ reportId, category, customNote }) {
  if (!reportId) throw new Error('reportId is required')
  if (!category) throw new Error('Rejection category is required')

  const rejectionReason = buildRejectionMessage(category, customNote, REPORT_REJECTION_PRESETS)
  if (!rejectionReason?.trim()) {
    throw new Error('Please provide a rejection reason for the volunteer.')
  }

  const { error } = await supabase
    .from('reports')
    .update({
      status: 'rejected',
      rejection_category: category,
      rejection_reason: rejectionReason.trim(),
      rejected_at: new Date().toISOString(),
    })
    .eq('id', reportId)
    .eq('status', 'pending')

  if (error) throw error
}

export { REPORT_REJECTION_PRESETS }
