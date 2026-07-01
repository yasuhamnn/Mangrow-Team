import { supabase } from '../../supabaseClient'
import { REPORT_SELECT, mapReportRow, getStatusLabel } from './shared/reportQuery'

export async function getRecentAdminActivity(limit = 5) {
  const { data, error } = await supabase
    .from('reports')
    .select(REPORT_SELECT)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) throw error

  return (data || []).map((row) => {
    const report = mapReportRow(row)
    return {
      ...report,
      statusLabel: getStatusLabel(report.status),
    }
  })
}

export { getAdminProfile, getAdminStats } from './adminService'
