import { supabase } from '../../supabaseClient'

/**
 * Fetches the current admin's profile data from the 'users' table.
 */
export const getAdminProfile = async () => {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', user.id)
    .single()

  if (error) throw error
  return { ...data, email: user.email }
}

/**
 * Fetches dashboard statistics for the admin.
 */
export const getAdminStats = async () => {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { pending: 0, verified: 0, alerts: 0 }

  // Fetch counts from the 'reports' table
  const { count: pendingCount } = await supabase
    .from('reports')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'pending')

  const { count: verifiedCount } = await supabase
    .from('reports')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'under_review')

  // Fetch unread alerts from 'notifications' table
  const { count: alertsCount } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('is_read', false)

  return {
    pending: pendingCount || 0,
    verified: verifiedCount || 0,
    alerts: alertsCount || 0,
  }
}

/**
 * Uploads a new avatar to the 'avatars' bucket and updates the user record.
 * @param {string} uri - Local URI of the image.
 */
export const uploadAdminAvatar = async (uri) => {
  const { data: authData } = await supabase.auth.getUser()
  const user = authData?.user
  if (!user) throw new Error('No user session found')

  // 1. Prepare file for upload
  const fileExt = uri.split('.').pop()?.toLowerCase() || 'jpg'
  const fileName = `${user.id}.${fileExt}`
  const filePath = fileName

  const response = await fetch(uri)
  const arrayBuffer = await response.arrayBuffer()

  // 2. Upload to Supabase Storage (Bucket name: "avatars")
  const { error: uploadError } = await supabase.storage
    .from('avatars')
    .upload(filePath, arrayBuffer, {
      contentType: `image/${fileExt === 'jpg' ? 'jpeg' : fileExt}`,
      upsert: true
    })

  if (uploadError) throw uploadError

  // 3. Get Public URL
  const { data: { publicUrl } } = supabase.storage
    .from('avatars')
    .getPublicUrl(filePath)

  // 4. Update the 'users' table
  const { error: updateError } = await supabase
    .from('users')
    .update({ avatar_url: publicUrl })
    .eq('id', user.id)

  if (updateError) throw updateError

  return `${publicUrl}?t=${Date.now()}`
}

export const signOutAdmin = async () => {
  await supabase.auth.signOut()
}