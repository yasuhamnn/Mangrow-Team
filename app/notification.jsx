import React, { useCallback, useEffect, useRef, useState } from 'react'
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  Animated,
  ActivityIndicator,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import BottomNav from './components/BottomNav'
import { supabase } from '../supabaseClient'
import {
  getVolunteerNotifications,
  markVolunteerNotificationAsRead,
  markAllVolunteerNotificationsAsRead,
  subscribeToVolunteerNotifications,
} from './utils/notificationBackend'
import { getRouteFromInAppNotification } from './utils/pushNotificationNavigation'
import { getUserProfile } from './utils/userService'
import { useBottomNavMetrics } from './utils/shared/screenLayout'
import { usePullToRefresh } from './utils/shared/usePullToRefresh'
import ScreenHeader, { HeaderBackButton, screenLayoutStyles } from './components/ScreenHeader'

function formatTimeLabel(createdAt) {
  if (!createdAt) return 'just now'
  const dateMs = new Date(createdAt).getTime()
  if (isNaN(dateMs)) return 'just now'

  const diffMs = Date.now() - dateMs
  const diffMin = Math.floor(diffMs / 60000)

  if (diffMin < 1) return 'just now'
  if (diffMin < 60) return `${diffMin}m ago`

  const diffHours = Math.floor(diffMin / 60)
  if (diffHours < 24) return `${diffHours}h ago`

  const diffDays = Math.floor(diffHours / 24)
  return `${diffDays}d ago`
}

export default function Notification() {
  const router = useRouter()
  const { scrollPadding } = useBottomNavMetrics()
  const fadeAnim = useRef(new Animated.Value(0)).current
  const slideAnim = useRef(new Animated.Value(10)).current
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(true)

  const reloadNotifications = useCallback(async () => {
    const data = await getVolunteerNotifications()
    setNotifications(data)
  }, [])

  const { refreshControl } = usePullToRefresh(reloadNotifications)

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start()
  }, [])

  useEffect(() => {
    let mounted = true
    let subscription = null

    const load = async () => {
      try {
        setLoading(true)
        const { data: authData } = await supabase.auth.getUser()
        const user = authData?.user
        if (!user || !mounted) return

        const data = await getVolunteerNotifications()
        if (mounted) {
          setNotifications(data)
          subscription = subscribeToVolunteerNotifications(user.id, (payload) => {
            if (!mounted) return
            if (payload.eventType === 'INSERT') {
              setNotifications((prev) => [payload.new, ...prev])
            } else if (payload.eventType === 'UPDATE') {
              setNotifications((prev) =>
                prev.map((n) => (n.id === payload.new.id ? payload.new : n))
              )
            } else if (payload.eventType === 'DELETE') {
              setNotifications((prev) => prev.filter((n) => n.id !== payload.old.id))
            }
          }, 'list')
        }
      } catch {
        if (mounted) setNotifications([])
      } finally {
        if (mounted) setLoading(false)
      }
    }

    load()
    return () => {
      mounted = false
      if (subscription) supabase.removeChannel(subscription)
    }
  }, [])

  const onMarkAllRead = async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })))
    try {
      await markAllVolunteerNotificationsAsRead()
    } catch (e) {
      console.error('Failed to mark all as read:', e)
    }
  }

  const onPressNotification = async (item) => {
    if (!item.is_read) {
      setNotifications((prev) =>
        prev.map((n) => (n.id === item.id ? { ...n, is_read: true } : n))
      )
      await markVolunteerNotificationAsRead(item.id).catch(console.error)
    }

    const profile = await getUserProfile()
    const route = getRouteFromInAppNotification(item, profile?.role || 'volunteer')
    router.push(route)
  }

  const getIcon = (type) => {
    switch (type) {
      case 'approved':
        return { icon: 'checkmark-circle', bg: 'rgb(221, 243, 214)', color: 'rgb(45, 160, 49)' }
      case 'rejected':
        return { icon: 'close-circle', bg: 'rgb(255, 231, 231)', color: 'rgb(255, 77, 79)' }
      case 'resolution_rejected':
        return { icon: 'close-circle', bg: 'rgb(255, 231, 231)', color: 'rgb(255, 77, 79)' }
      case 'resolved':
        return { icon: 'leaf', bg: 'rgb(221, 243, 214)', color: 'rgb(109, 170, 26)' }
      default:
        return { icon: 'time', bg: 'rgb(255, 242, 217)', color: 'rgb(201, 138, 0)' }
    }
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <Animated.View
        style={{ flex: 1, opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}
      >
        <ScreenHeader
          title="Notification"
          subtitle={
            notifications.some((n) => !n.is_read) ? (
              <TouchableOpacity onPress={onMarkAllRead}>
                <Text style={styles.markAllText}>Mark all as read</Text>
              </TouchableOpacity>
            ) : null
          }
          right={<HeaderBackButton onPress={() => router.back()} icon="arrow-forward" />}
        />

        <ScrollView
          style={screenLayoutStyles.scrollView}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[screenLayoutStyles.scrollContent, { paddingBottom: scrollPadding }]}
          refreshControl={refreshControl}
        >
          {loading ? (
            <ActivityIndicator size="small" color="rgb(109, 170, 26)" style={{ marginTop: 20 }} />
          ) : notifications.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="notifications-off-outline" size={48} color="rgb(209, 213, 219)" />
              <Text style={styles.emptyText}>No notifications yet</Text>
            </View>
          ) : (
            notifications.map((item) => {
              const status = getIcon(item.type)
              const isRead = !!item.is_read

              return (
                <TouchableOpacity
                  key={item.id}
                  activeOpacity={0.85}
                  onPress={() => onPressNotification(item)}
                  style={[styles.notificationCard, !isRead && styles.unreadCard]}
                >
                  <View style={[styles.iconWrap, { backgroundColor: status.bg }]}>
                    <Ionicons name={status.icon} size={22} color={status.color} />
                  </View>

                  <View style={styles.cardContent}>
                    <View style={styles.cardTop}>
                      <View style={styles.titleRow}>
                        {!isRead && <View style={styles.unreadDot} />}
                        <Text style={styles.cardTitle}>{item.title}</Text>
                      </View>
                      <Text style={styles.timeText}>{formatTimeLabel(item.created_at)}</Text>
                    </View>
                    <Text style={styles.cardDescription}>{item.message}</Text>
                  </View>
                </TouchableOpacity>
              )
            })
          )}
        </ScrollView>
      </Animated.View>

      <BottomNav activeTab="alert" />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'rgb(251, 252, 247)',
  },
  content: {
    padding: 16,
    paddingBottom: 16,
  },
  markAllText: {
    fontSize: 12,
    color: 'rgb(109, 170, 26)',
    fontFamily: 'Montserrat_600SemiBold',
    marginTop: 2,
  },
  notificationCard: {
    flexDirection: 'row',
    backgroundColor: 'rgb(255, 255, 255)',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgb(232, 236, 221)',
    padding: 14,
    marginBottom: 12,
    alignItems: 'center',
  },
  unreadCard: {
    backgroundColor: 'rgb(247, 252, 242)',
    borderColor: 'rgb(221, 243, 214)',
  },
  iconWrap: {
    width: 42,
    height: 42,
    borderRadius: 21,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  cardContent: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  unreadDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgb(109, 170, 26)',
    marginRight: 6,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  cardTitle: {
    fontSize: 14,
    color: 'rgb(16, 32, 15)',
    fontFamily: 'Montserrat_700Bold',
  },
  timeText: {
    fontSize: 11,
    color: 'rgb(156, 163, 175)',
    fontFamily: 'Montserrat_400Regular',
  },
  cardDescription: {
    fontSize: 12,
    lineHeight: 18,
    color: 'rgb(107, 114, 128)',
    fontFamily: 'Montserrat_400Regular',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 60,
  },
  emptyText: {
    marginTop: 12,
    color: 'rgb(156, 163, 175)',
    fontFamily: 'Montserrat_500Medium',
  },
})
