import { supabase } from '../../supabaseClient'
import { REPORT_SELECT, mapReportRow } from './shared/reportQuery'
import { requestReportResolution } from './reportDetailsBackend'

function removeExistingChannel(channelName) {
  const topic = `realtime:${channelName}`
  const existing = supabase.getChannels().find((ch) => ch.topic === topic)
  if (existing) {
    void supabase.removeChannel(existing)
  }
}

/** All submitted reports for the volunteer map and list (no limit). */
export async function getReportedLocationsForVolunteerMap() {
  const { data, error } = await supabase
    .from('reports')
    .select(REPORT_SELECT)
    .order('created_at', { ascending: false })

  if (error) throw error
  return (data || []).map(mapReportRow)
}

export function subscribeToMapReports(onChange, scope = 'volunteer-map') {
  const channelName = `map-reports-${scope}`
  removeExistingChannel(channelName)

  return supabase
    .channel(channelName)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'reports' },
      () => onChange()
    )
    .subscribe()
}

export { requestReportResolution }
