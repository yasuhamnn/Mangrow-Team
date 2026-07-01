import { supabase } from '../../supabaseClient'
import { buildLocationText } from './shared/locationFormat'

/**
 * Uploads an image to the 'reports' bucket in Supabase Storage.
 */
export async function uploadReportImage(uri) {
  const { data: authData } = await supabase.auth.getUser()
  const user = authData?.user
  if (!user) throw new Error('No user session found')

  const fileExt = uri.split('.').pop()?.toLowerCase() || 'jpg'
  const fileName = `${user.id}/${Date.now()}.${fileExt}`

  const response = await fetch(uri)
  const arrayBuffer = await response.arrayBuffer()

  const { error: uploadError } = await supabase.storage
    .from('reports')
    .upload(fileName, arrayBuffer, {
      contentType: `image/${fileExt === 'jpg' ? 'jpeg' : fileExt}`,
      upsert: false,
    })

  if (uploadError) throw uploadError

  const { data: { publicUrl } } = supabase.storage
    .from('reports')
    .getPublicUrl(fileName)

  return publicUrl
}

async function resolveSpeciesId(speciesName) {
  if (!speciesName?.trim()) return null

  const { data, error } = await supabase
    .from('mangrove_species')
    .select('id')
    .ilike('name', speciesName.trim())
    .maybeSingle()

  if (error) {
    console.warn('Species lookup failed:', error.message)
    return null
  }

  return data?.id ?? null
}

/**
 * Submits a mangrove report to Supabase.
 */
export async function submitReport(reportData = {}) {
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    throw new Error('User must be signed in to submit a report.')
  }

  const {
    imageUri,
    imageUrl = null,
    latitude,
    longitude,
    species = null,
    healthStatus = null,
    reportStatus = null,
    notes = null,
    purok = null,
    street = null,
    barangay = null,
    city = null,
    subregion = null,
    formattedAddress = null,
    additionalImageUrls = [],
  } = reportData

  if (latitude == null || longitude == null) {
    throw new Error('latitude and longitude are required.')
  }

  if (!imageUri && !imageUrl) {
    throw new Error('Either imageUri or imageUrl must be provided.')
  }

  if (healthStatus && !['healthy', 'unhealthy'].includes(healthStatus)) {
    throw new Error(`Invalid healthStatus "${healthStatus}". Must be "healthy" or "unhealthy".`)
  }

  let finalImageUrl = imageUrl
  if (!finalImageUrl && imageUri) {
    finalImageUrl = await uploadReportImage(imageUri)
  }

  const speciesId = await resolveSpeciesId(species)
  const locationText = buildLocationText({ purok, street, barangay, city, subregion, formattedAddress })

  const resolvedStatus = reportStatus
    || (healthStatus === 'healthy' ? 'recorded' : 'pending')

  if (!['pending', 'recorded'].includes(resolvedStatus)) {
    throw new Error(`Invalid reportStatus "${resolvedStatus}". Volunteers may only use "pending" or "recorded".`)
  }

  const { data: reportRows, error: insertError } = await supabase
    .from('reports')
    .insert([
      {
        user_id: user.id,
        species_id: speciesId,
        image_url: finalImageUrl,
        health_status: healthStatus,
        latitude: Number(latitude),
        longitude: Number(longitude),
        location_text: locationText,
        field_notes: notes,
        status: resolvedStatus,
      },
    ])
    .select('id')
    .single()

  if (insertError) throw insertError

  const reportId = reportRows.id

  if (additionalImageUrls.length > 0) {
    const attachments = additionalImageUrls.map((url) => ({
      report_id: reportId,
      image_url: url,
    }))

    const { error: attachmentError } = await supabase
      .from('report_attachments')
      .insert(attachments)

    if (attachmentError) {
      console.warn('Report attachments failed:', attachmentError.message)
    }
  }

  return reportId
}

/**
 * Updates an existing report's fields.
 */
export async function updateReport(reportId, updates = {}) {
  if (!reportId) {
    throw new Error('reportId is required to update a report.')
  }

  const allowedFields = ['image_url', 'health_status', 'field_notes', 'status', 'species_id']
  const sanitized = {}

  Object.keys(updates).forEach((key) => {
    if (allowedFields.includes(key) && updates[key] !== undefined) {
      sanitized[key] = updates[key]
    }
  })

  if (Object.keys(sanitized).length === 0) return

  const { error } = await supabase.from('reports').update(sanitized).eq('id', reportId)
  if (error) throw error
}

export function isValidStatusTransition(currentStatus, newStatus) {
  const transitions = {
    pending: ['under_review', 'rejected'],
    under_review: ['resolved', 'rejected'],
    resolved: [],
    rejected: [],
  }

  return (transitions[currentStatus] || []).includes(newStatus)
}
