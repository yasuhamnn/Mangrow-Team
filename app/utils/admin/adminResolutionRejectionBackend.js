import { supabase } from '../../../supabaseClient'
import { buildRejectionMessage, RESOLUTION_REJECTION_PRESETS } from '../shared/rejectionReasons'

const RESOLUTION_SELECT = `
  id,
  report_id,
  user_id,
  notes,
  image_url,
  status,
  created_at,
  users ( full_name, avatar_url )
`

export async function getResolutionForRejection(resolutionId) {
  if (!resolutionId) throw new Error('resolutionId is required')

  const { data, error } = await supabase
    .from('report_resolutions')
    .select(RESOLUTION_SELECT)
    .eq('id', resolutionId)
    .eq('status', 'pending')
    .single()

  if (error) throw error
  return data
}

export async function rejectResolutionWithReason({ resolutionId, category, customNote }) {
  if (!resolutionId) throw new Error('resolutionId is required')
  if (!category) throw new Error('Rejection category is required')

  const rejectionReason = buildRejectionMessage(category, customNote, RESOLUTION_REJECTION_PRESETS)
  if (!rejectionReason?.trim()) {
    throw new Error('Please provide a rejection reason for the volunteer.')
  }

  const { error } = await supabase
    .from('report_resolutions')
    .update({
      status: 'rejected',
      rejection_category: category,
      rejection_reason: rejectionReason.trim(),
      rejected_at: new Date().toISOString(),
    })
    .eq('id', resolutionId)
    .eq('status', 'pending')

  if (error) throw error
}

export { RESOLUTION_REJECTION_PRESETS }
