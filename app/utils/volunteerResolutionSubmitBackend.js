import { supabase } from '../../supabaseClient'

export async function uploadResolutionImage(uri) {
  const { data: authData } = await supabase.auth.getUser()
  const user = authData?.user
  if (!user) throw new Error('You must be signed in to upload resolution photos.')

  const fileExt = uri.split('.').pop()?.toLowerCase() || 'jpg'
  const fileName = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`

  const response = await fetch(uri)
  const arrayBuffer = await response.arrayBuffer()

  const { error: uploadError } = await supabase.storage
    .from('resolutions')
    .upload(fileName, arrayBuffer, {
      contentType: `image/${fileExt === 'jpg' ? 'jpeg' : fileExt}`,
      upsert: false,
    })

  if (uploadError) throw uploadError

  const { data: { publicUrl } } = supabase.storage.from('resolutions').getPublicUrl(fileName)
  return publicUrl
}

export async function getActiveResolutionForReport(reportId) {
  if (!reportId) throw new Error('Report id is required')

  const { data: authData } = await supabase.auth.getUser()
  const userId = authData?.user?.id
  if (!userId) throw new Error('You must be signed in.')

  const { data, error } = await supabase
    .from('report_resolutions')
    .select('id, status, created_at, notes')
    .eq('report_id', reportId)
    .eq('user_id', userId)
    .in('status', ['pending', 'under_review'])
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) throw error
  return data
}

export async function submitResolutionProof({
  reportId,
  notes,
  imageUris = [],
  latitude = null,
  longitude = null,
}) {
  if (!reportId) throw new Error('Report id is required')
  if (!notes?.trim()) throw new Error('Please add resolution notes.')
  if (!imageUris.length) throw new Error('Please add at least one resolution photo.')

  const { data: authData } = await supabase.auth.getUser()
  const userId = authData?.user?.id
  if (!userId) throw new Error('You must be signed in.')

  const { data: report, error: reportError } = await supabase
    .from('reports')
    .select('id, status, user_id')
    .eq('id', reportId)
    .single()

  if (reportError) throw reportError
  if (report.user_id !== userId) throw new Error('You can only submit a resolution for your own report.')
  if (report.status !== 'under_review') {
    throw new Error('This report is not eligible for resolution submission.')
  }

  const existing = await getActiveResolutionForReport(reportId)
  if (existing) {
    throw new Error('You already have a resolution awaiting admin review for this report.')
  }

  const uploadedUrls = []
  for (const uri of imageUris) {
    uploadedUrls.push(await uploadResolutionImage(uri))
  }

  const { data: resolutionId, error: rpcError } = await supabase.rpc('submit_resolution_proof', {
    p_report_id: reportId,
    p_notes: notes.trim(),
    p_image_url: uploadedUrls[0],
    p_latitude: latitude,
    p_longitude: longitude,
  })

  if (rpcError) throw rpcError

  if (uploadedUrls.length > 1 && resolutionId) {
    const attachments = uploadedUrls.slice(1).map((url) => ({
      resolution_id: resolutionId,
      image_url: url,
    }))
    const { error: attachmentError } = await supabase.from('resolution_attachments').insert(attachments)
    if (attachmentError) throw attachmentError
  }

  return { id: resolutionId }
}
