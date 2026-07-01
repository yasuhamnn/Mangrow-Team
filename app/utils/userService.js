import { supabase } from '../../supabaseClient'

export const getUserRole = async (uid) => {
  const { data, error } = await supabase
    .from('users')
    .select('role')
    .eq('id', uid)
    .single()

  if (error) throw error
  return data?.role // Returns 'admin' or 'volunteer'
}

export const getUserProfile = async () => {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase
    .from('users')
    .select('full_name, avatar_url, role')
    .eq('id', user.id)
    .single()

  return {
    ...profile,
    email: user.email,
    id: user.id,
    full_name: profile?.full_name || user.user_metadata?.full_name || user.email?.split('@')[0] || 'User',
    avatar_url: profile?.avatar_url || null,
  }
}

export const updateUserProfile = async (updates) => {
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) throw new Error('No user session found');

  const { error } = await supabase
    .from('users')
    .update(updates)
    .eq('id', user.id);

  if (error) throw error;
};