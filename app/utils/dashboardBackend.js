import { supabase } from '../../supabaseClient'
import { REPORT_SELECT, mapReportRow } from './shared/reportQuery'

export async function getVolunteerDashboardStats() {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { unhealthy: 0, resolved: 0, myReports: 0 }

  const { data, error } = await supabase
    .from('reports')
    .select('health_status, status')
    .eq('user_id', user.id)

  if (error) throw error

  const reports = data || []
  return {
    unhealthy: reports.filter((r) => r.health_status === 'unhealthy' && (r.status === 'under_review' || r.status === 'resolved')).length,
    resolved: reports.filter((r) => r.status === 'resolved').length,
    myReports: reports.length,
  }
}

export async function getRecentReportsForDashboard(limit = 5) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data, error } = await supabase
    .from('reports')
    .select(REPORT_SELECT)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) throw error
  return (data || []).map(mapReportRow).slice(0, limit)
}
