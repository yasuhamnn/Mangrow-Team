import { Dimensions } from 'react-native'

export const LIST_FILTERS = ['All', 'Unhealthy', 'Healthy', 'Unresolved', 'Under Review', 'Resolved']

export const MAP_TYPES = [
  { id: 'standard', label: 'Standard' },
  { id: 'satellite', label: 'Satellite' },
]

export const EMBEDDED_MAP_HEIGHT = Dimensions.get('window').height * 0.55

export const DEFAULT_MAP_CENTER = [11.0519, 124.0055]

export function filterReportsByChip(reports, activeFilter) {
  if (activeFilter === 'All') return reports
  if (activeFilter === 'Unhealthy') return reports.filter((r) => r.health_status === 'unhealthy')
  if (activeFilter === 'Healthy') return reports.filter((r) => r.health_status === 'healthy')
  if (activeFilter === 'Unresolved') return reports.filter((r) => r.status === 'under_review')
  if (activeFilter === 'Under Review') return reports.filter((r) => r.status === 'pending')
  if (activeFilter === 'Resolved') return reports.filter((r) => r.status === 'resolved')
  return reports
}

export function filterReportsForMap(reports, { showHealthy, showUnhealthy }) {
  return reports.filter((r) => {
    const isHealthy = String(r.health_status).toLowerCase() === 'healthy'
    if (isHealthy && !showHealthy) return false
    if (!isHealthy && !showUnhealthy) return false
    return r.latitude != null && r.longitude != null
  })
}
