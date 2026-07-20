import { supabase } from '../../supabaseClient'
import { REPORT_SELECT, mapReportRow } from './shared/reportQuery'

export async function getReportDestination(reportId) {
  if (!reportId) throw new Error('Report id is required')

  const { data, error } = await supabase
    .from('reports')
    .select(REPORT_SELECT)
    .eq('id', reportId)
    .single()

  if (error) throw error

  const report = mapReportRow(data)
  if (report.latitude == null || report.longitude == null) {
    throw new Error('This report does not have map coordinates.')
  }

  return report
}

export async function fetchRouteToDestination(origin, destination) {
  if (!origin?.latitude || !origin?.longitude) {
    throw new Error('Current location is required.')
  }
  if (!destination?.latitude || !destination?.longitude) {
    throw new Error('Destination is required.')
  }

  const url =
    `https://router.project-osrm.org/route/v1/foot/` +
    `${origin.longitude},${origin.latitude};` +
    `${destination.longitude},${destination.latitude}` +
    '?overview=full&geometries=geojson'

  try {
    const response = await fetch(url)
    const json = await response.json()
    const coords = json?.routes?.[0]?.geometry?.coordinates
    if (!coords?.length) throw new Error('No route found')

    return {
      coordinates: coords.map(([lng, lat]) => ({ latitude: lat, longitude: lng })),
      distanceMeters: json.routes[0].distance,
      durationSeconds: json.routes[0].duration,
      isFallback: false,
    }
  } catch {
    return {
      coordinates: [
        { latitude: origin.latitude, longitude: origin.longitude },
        { latitude: destination.latitude, longitude: destination.longitude },
      ],
      distanceMeters: haversineMeters(origin, destination),
      durationSeconds: null,
      isFallback: true,
    }
  }
}

function haversineMeters(a, b) {
  const toRad = (v) => (v * Math.PI) / 180
  const R = 6371000
  const dLat = toRad(b.latitude - a.latitude)
  const dLon = toRad(b.longitude - a.longitude)
  const lat1 = toRad(a.latitude)
  const lat2 = toRad(b.latitude)
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h))
}

export function formatDistance(meters) {
  if (meters == null) return '—'
  if (meters < 1000) return `${Math.round(meters)} m`
  return `${(meters / 1000).toFixed(1)} km`
}

export function formatDuration(seconds) {
  if (seconds == null) return null
  const mins = Math.round(seconds / 60)
  if (mins < 1) return '< 1 min walk'
  if (mins < 60) return `~${mins} min walk`
  const hours = Math.floor(mins / 60)
  const rem = mins % 60
  return rem > 0 ? `~${hours}h ${rem}m walk` : `~${hours}h walk`
}

export function isNearDestination(origin, destination, thresholdMeters = 80) {
  if (!origin || !destination) return false
  return haversineMeters(origin, destination) <= thresholdMeters
}
