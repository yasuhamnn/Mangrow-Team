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

function sortReportsByNewest(reports) {
  return [...reports].sort((a, b) => {
    const aTime = a?.created_at ? new Date(a.created_at).getTime() : 0
    const bTime = b?.created_at ? new Date(b.created_at).getTime() : 0
    return bTime - aTime
  })
}

export async function getRecentReportsForDashboard(limit = 5) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  try {
    const [communityResult, ownPrivateResult] = await Promise.all([
      supabase
        .from('reports')
        .select(REPORT_SELECT)
        .in('status', ['under_review', 'resolved', 'recorded'])
        .order('created_at', { ascending: false })
        .limit(limit),
      supabase
        .from('reports')
        .select(REPORT_SELECT)
        .eq('user_id', user.id)
        .in('status', ['rejected', 'pending'])
        .order('created_at', { ascending: false })
        .limit(limit),
    ])

    const communityRows = communityResult.error ? [] : (communityResult.data || [])
    const ownPrivateRows = ownPrivateResult.error ? [] : (ownPrivateResult.data || [])

    const merged = sortReportsByNewest(
      [...communityRows, ...ownPrivateRows]
        .map(mapReportRow)
        .filter(Boolean)
    )

    const seen = new Set()
    const unique = merged.filter((report) => {
      if (!report?.id || seen.has(report.id)) return false
      seen.add(report.id)
      return true
    })

    return unique.slice(0, limit)
  } catch {
    return []
  }
}
