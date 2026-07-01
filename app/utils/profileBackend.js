import { supabase } from '../../supabaseClient'

export async function getVolunteerProfileStats() {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { reports: 0, resolutions: 0 }

  const { data, error } = await supabase
    .from('reports')
    .select('status')
    .eq('user_id', user.id)

  if (error) throw error

  const reports = data || []
  return {
    reports: reports.length,
    resolutions: reports.filter((r) => r.status === 'resolved').length,
  }
}

export async function uploadVolunteerAvatar(uri) {
  const { data: authData } = await supabase.auth.getUser()
  const user = authData?.user
  if (!user) throw new Error('No user session found')

  const fileExt = uri.split('.').pop()?.toLowerCase() || 'jpg'
  const fileName = `${user.id}.${fileExt}`

  const response = await fetch(uri)
  const arrayBuffer = await response.arrayBuffer()

  const { error: uploadError } = await supabase.storage
    .from('avatars')
    .upload(fileName, arrayBuffer, {
      contentType: `image/${fileExt === 'jpg' ? 'jpeg' : fileExt}`,
      upsert: true,
    })

  if (uploadError) throw uploadError

  const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(fileName)

  const { error: updateError } = await supabase
    .from('users')
    .update({ avatar_url: publicUrl })
    .eq('id', user.id)

  if (updateError) throw updateError

  return `${publicUrl}?t=${Date.now()}`
}
