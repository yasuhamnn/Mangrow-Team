import { supabase } from '../../supabaseClient'

export async function getVolunteerNotifications() {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data || []
}

export async function getUnreadVolunteerNotificationsCount() {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return 0

  const { count, error } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('is_read', false)

  if (error) return 0
  return count || 0
}

export async function markVolunteerNotificationAsRead(notificationId) {
  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('id', notificationId)

  if (error) throw error
}

export async function markAllVolunteerNotificationsAsRead() {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('user_id', user.id)
    .eq('is_read', false)

  if (error) throw error
}

function removeExistingChannel(channelName) {
  const topic = `realtime:${channelName}`
  const existing = supabase.getChannels().find((ch) => ch.topic === topic)
  if (existing) {
    void supabase.removeChannel(existing)
  }
}

export function subscribeToVolunteerNotifications(userId, onChange, scope = 'default') {
  const channelName = `volunteer-notifications-${userId}-${scope}`
  removeExistingChannel(channelName)

  return supabase
    .channel(channelName)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${userId}`,
      },
      (payload) => {
        onChange({
          eventType: payload.eventType,
          new: payload.new,
          old: payload.old,
        })
      }
    )
    .subscribe()
}

export async function markNotificationReadById(notificationId) {
  if (!notificationId) return
  await markVolunteerNotificationAsRead(notificationId).catch(console.error)
}
