import { supabase } from '../../supabaseClient'

export async function getAdminProfileStats() {
  const { count: pendingCount } = await supabase
    .from('reports')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'pending')

  const { count: verifiedCount } = await supabase
    .from('reports')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'under_review')

  return {
    pending: pendingCount || 0,
    verified: verifiedCount || 0,
  }
}

export { getAdminProfile, uploadAdminAvatar, signOutAdmin } from './adminService'
