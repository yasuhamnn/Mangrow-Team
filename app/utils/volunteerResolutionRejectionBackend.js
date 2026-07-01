import { supabase } from '../../supabaseClient'

export async function getResolutionRejectionFeedback(reportId) {
  if (!reportId) throw new Error('Report id is required')

  const { data: authData } = await supabase.auth.getUser()
  const userId = authData?.user?.id
  if (!userId) throw new Error('You must be signed in to view rejection feedback.')

  const { data, error } = await supabase
    .from('report_resolutions')
    .select(`
      id,
      report_id,
      rejection_category,
      rejection_reason,
      rejected_at,
      created_at,
      notes
    `)
    .eq('report_id', reportId)
    .eq('user_id', userId)
    .eq('status', 'rejected')
    .order('rejected_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) throw error
  if (!data) throw new Error('No resolution rejection feedback found for this report.')
  return data
}
