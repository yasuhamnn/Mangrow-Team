import { supabase } from '../../supabaseClient'
import { markVolunteerNotificationAsRead } from './notificationBackend'
import { markAdminNotificationAsRead } from './adminNotificationBackend'

function extractNotificationData(response) {
  return response?.notification?.request?.content?.data ?? {}
}

async function getCurrentUserRole() {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .maybeSingle()

  return data?.role ?? 'volunteer'
}

export function getRouteFromNotificationPayload(data, role) {
  const type = data?.type
  const relatedId = data?.relatedId ?? data?.related_id

  if (role === 'admin') {
    if ((type === 'new_report' || type === 'resolution') && relatedId) {
      return {
        pathname: '/admin/admin_verify',
        params: { reportId: relatedId },
      }
    }
    return { pathname: '/admin/admin_notification' }
  }

  if (type === 'rejected' && relatedId) {
    return {
      pathname: '/report_rejection_feedback',
      params: { id: relatedId },
    }
  }

  if (type === 'resolution_rejected' && relatedId) {
    return {
      pathname: '/resolution_rejection_feedback',
      params: { reportId: relatedId },
    }
  }

  if (relatedId && ['approved', 'resolved', 'update'].includes(type)) {
    return {
      pathname: '/report_details',
      params: { id: relatedId },
    }
  }

  return { pathname: '/notification' }
}

export async function handleNotificationResponse(router, response) {
  if (!router || !response) return

  const role = await getCurrentUserRole()
  if (!role) return // not logged in, ignore

  const data = extractNotificationData(response)

  if (data.notificationId) {
    if (role === 'admin') {
      await markAdminNotificationAsRead(data.notificationId)
    } else {
      await markVolunteerNotificationAsRead(data.notificationId)
    }
  }

  const route = getRouteFromNotificationPayload(data, role)
  router.push(route)
}

export async function handleColdStartNotification(router) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  const Notifications = await import('expo-notifications')
  const response = await Notifications.getLastNotificationResponseAsync()
  if (!response) return

  setTimeout(() => {
    handleNotificationResponse(router, response)
  }, 800)
}

export function getRouteFromInAppNotification(item, role) {
  return getRouteFromNotificationPayload(
    {
      type: item.type,
      relatedId: item.related_id,
      notificationId: item.id,
    },
    role
  )
}
