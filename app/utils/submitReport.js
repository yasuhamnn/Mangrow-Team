import { manipulateAsync, SaveFormat } from 'expo-image-manipulator'
import { supabase } from '../../supabaseClient'
import { buildLocationText } from './shared/locationFormat'
import { assertNetworkAvailable, toSubmissionErrorMessage } from './networkStatus'

const MAX_IMAGE_DIMENSION = 1280
const JPEG_QUALITY = 0.72
const speciesIdCache = new Map()

/**
 * Resize and compress a local image before upload (much faster on slow networks).
 */
export async function compressReportImage(uri) {
  if (!uri) throw new Error('Image uri is required')

  const result = await manipulateAsync(
    uri,
    [{ resize: { width: MAX_IMAGE_DIMENSION } }],
    { compress: JPEG_QUALITY, format: SaveFormat.JPEG }
  )

  return result.uri
}

/**
 * Uploads a compressed image to the reports bucket.
 */
export async function uploadReportImage(uri, userId) {
  if (!userId) throw new Error('No user session found')

  const compressedUri = await compressReportImage(uri)
  const fileName = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`

  const response = await fetch(compressedUri)
  const arrayBuffer = await response.arrayBuffer()

  const { error: uploadError } = await supabase.storage
    .from('reports')
    .upload(fileName, arrayBuffer, {
      contentType: 'image/jpeg',
      upsert: false,
    })

  if (uploadError) throw uploadError

  const { data: { publicUrl } } = supabase.storage
    .from('reports')
    .getPublicUrl(fileName)

  return publicUrl
}

async function uploadReportImagesParallel(uris, userId) {
  if (!uris.length) return []
  return Promise.all(uris.map((uri) => uploadReportImage(uri, userId)))
}

async function resolveSpeciesId(speciesName) {
  if (!speciesName?.trim()) return null

  const key = speciesName.trim().toLowerCase()
  if (speciesIdCache.has(key)) return speciesIdCache.get(key)

  const { data, error } = await supabase
    .from('mangrove_species')
    .select('id')
    .ilike('name', speciesName.trim())
    .maybeSingle()

  if (error) {
    console.warn('Species lookup failed:', error.message)
    return null
  }

  const id = data?.id ?? null
  speciesIdCache.set(key, id)
  return id
}

/**
 * Submits a mangrove report to Supabase.
 * @param {object} reportData
 * @param {(step: string) => void} [reportData.onProgress] - optional progress callback
 */
export async function submitReport(reportData = {}) {
  const {
    imageUri,
    imageUrl = null,
    additionalImageUris = [],
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
    onProgress,
  } = reportData

  try {
    onProgress?.('Checking connection…')
    await assertNetworkAvailable()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      throw new Error('You must be signed in to submit a report.')
    }

    if (latitude == null || longitude == null) {
      throw new Error('Latitude and longitude are required.')
    }

    if (!imageUri && !imageUrl) {
      throw new Error('A report photo is required.')
    }

    if (healthStatus && !['healthy', 'unhealthy'].includes(healthStatus)) {
      throw new Error(`Invalid health status "${healthStatus}".`)
    }

    const extraUris = additionalImageUris.filter(Boolean)
    const preUploadedExtras = additionalImageUrls.filter(Boolean)

    onProgress?.('Preparing photos…')

    // Upload main photo, extra photos, and species lookup in parallel
    onProgress?.(
      extraUris.length > 0
        ? `Uploading ${1 + extraUris.length} photo${1 + extraUris.length === 1 ? '' : 's'}…`
        : 'Uploading photo…'
    )

    const [finalImageUrl, speciesId, uploadedExtraUrls] = await Promise.all([
      imageUrl
        ? Promise.resolve(imageUrl)
        : uploadReportImage(imageUri, user.id),
      resolveSpeciesId(species),
      extraUris.length > 0
        ? uploadReportImagesParallel(extraUris, user.id)
        : Promise.resolve([]),
    ])

    const allAdditionalUrls = [...preUploadedExtras, ...uploadedExtraUrls]
    const locationText = buildLocationText({ purok, street, barangay, city, subregion, formattedAddress })

    const resolvedStatus = reportStatus
      || (healthStatus === 'healthy' ? 'recorded' : 'pending')

    if (!['pending', 'recorded'].includes(resolvedStatus)) {
      throw new Error(`Invalid report status "${resolvedStatus}".`)
    }

    onProgress?.('Saving report…')

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

    if (allAdditionalUrls.length > 0) {
      const attachments = allAdditionalUrls.map((url) => ({
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
  } catch (error) {
    throw new Error(toSubmissionErrorMessage(error))
  }
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
