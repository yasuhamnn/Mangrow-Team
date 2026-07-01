import { supabase } from '../../supabaseClient'
import { REPORT_SELECT, mapReportRow } from './shared/reportQuery'

function removeExistingChannel(channelName) {
  const topic = `realtime:${channelName}`
  const existing = supabase.getChannels().find((ch) => ch.topic === topic)
  if (existing) {
    void supabase.removeChannel(existing)
  }
}

export async function searchMangroveData(query) {
  const term = query?.trim()
  if (!term) return { species: [], reports: [] }

  const pattern = `%${term}%`

  const [speciesResult, reportsResult] = await Promise.all([
    supabase
      .from('mangrove_species')
      .select('id, name')
      .ilike('name', pattern)
      .limit(10),
    supabase
      .from('reports')
      .select(REPORT_SELECT)
      .ilike('location_text', pattern)
      .order('created_at', { ascending: false })
      .limit(10),
  ])

  if (speciesResult.error) throw speciesResult.error
  if (reportsResult.error) throw reportsResult.error

  return {
    species: speciesResult.data || [],
    reports: (reportsResult.data || []).map(mapReportRow),
  }
}

export async function searchReportsBySpeciesName(speciesName) {
  if (!speciesName?.trim()) return []

  const { data: speciesRows, error: speciesError } = await supabase
    .from('mangrove_species')
    .select('id')
    .ilike('name', speciesName.trim())

  if (speciesError) throw speciesError
  if (!speciesRows?.length) return []

  const speciesIds = speciesRows.map((s) => s.id)

  const { data, error } = await supabase
    .from('reports')
    .select(REPORT_SELECT)
    .in('species_id', speciesIds)
    .order('created_at', { ascending: false })
    .limit(10)

  if (error) throw error
  return (data || []).map(mapReportRow)
}

/** Re-fetch search results when reports or species change in Supabase Realtime */
export function subscribeToSearchDataChanges(onChange, scope = 'search') {
  const channelName = `search-data-${scope}`
  removeExistingChannel(channelName)

  return supabase
    .channel(channelName)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'reports' },
      () => onChange()
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'mangrove_species' },
      () => onChange()
    )
    .subscribe()
}
