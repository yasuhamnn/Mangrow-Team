import { supabase } from '../../../supabaseClient'
import { REPORT_SELECT, mapReportRow } from '../shared/reportQuery'

export async function getPendingReports() {
  const { data, error } = await supabase
    .from('reports')
    .select(`${REPORT_SELECT}, report_attachments ( id, image_url ), users ( full_name, avatar_url )`)
    .eq('status', 'pending')
    .order('created_at', { ascending: false })

  if (error) throw error

  return (data || []).map((row) => ({
    ...mapReportRow(row),
    attachments: row.report_attachments || [],
    volunteer_name: row.users?.full_name || 'Volunteer',
    volunteer_avatar: row.users?.avatar_url || null,
  }))
}

export async function submitReportVerificationDecision({ reportId, decision }) {
  if (!reportId) throw new Error('reportId is required')

  const statusMap = {
    approved: 'under_review',
    rejected: 'rejected',
  }

  const newStatus = statusMap[decision]
  if (!newStatus) {
    throw new Error(`Invalid decision "${decision}". Use approved or rejected.`)
  }

  const { error } = await supabase
    .from('reports')
    .update({ status: newStatus })
    .eq('id', reportId)

  if (error) throw error
}
