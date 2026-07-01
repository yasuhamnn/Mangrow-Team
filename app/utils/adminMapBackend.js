import { supabase } from '../../supabaseClient'
import { REPORT_SELECT, mapReportRow } from './shared/reportQuery'

export async function getApprovedReportsForMap() {
  const { data, error } = await supabase
    .from('reports')
    .select(REPORT_SELECT)
    .in('status', ['under_review', 'resolved', 'recorded'])
    .order('created_at', { ascending: false })

  if (error) throw error
  return (data || []).map(mapReportRow)
}
