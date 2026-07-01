import React, { useEffect, useRef, useState } from 'react'
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  Animated,
  ActivityIndicator,
} from 'react-native'
import { supabase } from '../../supabaseClient'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import AdminBottomNav from './AdminBottomNav'
import {
  getAdminNotifications,
  markAdminNotificationAsRead,
  markAllAdminNotificationsAsRead,
  subscribeToAdminNotifications,
} from '../utils/adminNotificationBackend'
import { getRouteFromInAppNotification } from '../utils/pushNotificationNavigation'
import { useBottomNavMetrics } from '../utils/shared/screenLayout'

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

export default function AdminNotification() {
  const router = useRouter()
  const { scrollPadding } = useBottomNavMetrics()
  const fadeAnim = useRef(new Animated.Value(0)).current
  const slideAnim = useRef(new Animated.Value(10)).current
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(true)

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

        const data = await getAdminNotifications()
        if (mounted) {
          setNotifications(data)
          subscription = subscribeToAdminNotifications(user.id, (payload) => {
            if (mounted) {
              if (payload.eventType === 'INSERT') {
                setNotifications(prev => [payload.new, ...prev])
              } else if (payload.eventType === 'UPDATE') {
                setNotifications(prev => prev.map(n => n.id === payload.new.id ? payload.new : n))
              } else if (payload.eventType === 'DELETE') {
                setNotifications(prev => prev.filter(n => n.id !== payload.old.id))
              }
            }
          }, 'list')
        }
      } catch (e) {
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
    // Optimistic UI update
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
    try {
      await markAllAdminNotificationsAsRead()
    } catch (e) {
      console.error('Failed to mark all as read:', e)
    }
  }

  const onPressNotification = async (item) => {
    if (!item.is_read) {
      setNotifications(prev => prev.map(n => n.id === item.id ? { ...n, is_read: true } : n))
      await markAdminNotificationAsRead(item.id).catch(console.error)
    }

    const route = getRouteFromInAppNotification(item, 'admin')
    router.push(route)
  }

  const getNotificationStyle = (type) => {
    switch (type) {
      case 'new_report':
        return {
          icon: 'document-text',
          bg: 'rgb(221, 243, 214)',
          color: 'rgb(45, 160, 49)',
        }

      case 'resolution':
        return {
          icon: 'checkmark-done-circle',
          bg: 'rgb(221, 243, 214)',
          color: 'rgb(45, 160, 49)',
        }

      case 'approved':
        return {
          icon: 'checkmark-circle',
          bg: 'rgb(221, 243, 214)',
          color: 'rgb(45, 160, 49)',
        }

      case 'rejected':
        return {
          icon: 'close-circle',
          bg: 'rgb(255, 231, 231)',
          color: 'rgb(255, 77, 79)',
        }

      case 'alert':
        return {
          icon: 'warning',
          bg: 'rgb(255, 242, 217)',
          color: 'rgb(201, 138, 0)',
        }

      default:
        return {
          icon: 'notifications',
          bg: 'rgb(239, 245, 232)',
          color: 'rgb(109, 170, 26)',
        }
    }
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <Animated.View
        style={{
          flex: 1,
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        }}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.content, { paddingBottom: scrollPadding }]}
        >
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>Notifications</Text>
              {notifications.some(n => !n.is_read) && (
                <TouchableOpacity onPress={onMarkAllRead}>
                  <Text style={styles.markAllText}>Mark all as read</Text>
                </TouchableOpacity>
              )}
            </View>
            <TouchableOpacity 
              style={styles.backButton} 
              onPress={() => router.back()}
              activeOpacity={0.8}
            >
              <Ionicons
                name="arrow-forward"
                size={18}
                color="rgb(16, 32, 15)"
              />
            </TouchableOpacity>
          </View>

          {/* Notification List */}
          {loading ? (
            <ActivityIndicator size="small" color="rgb(109, 170, 26)" style={{ marginTop: 20 }} />
          ) : notifications.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="notifications-off-outline" size={48} color="rgb(209, 213, 219)" />
              <Text style={styles.emptyText}>No notifications yet</Text>
            </View>
          ) : (
            notifications.map((item) => {
              const status = getNotificationStyle(item.type)
              const isRead = !!item.is_read
              const timeLabel = formatTimeLabel(item.created_at)

              return (
                <TouchableOpacity
                  key={item.id}
                  onPress={() => onPressNotification(item)}
                  activeOpacity={0.85}
                  style={[
                    styles.notificationCard,
                    !isRead && styles.unreadCard,
                  ]}
                >
                  <View
                    style={[
                      styles.iconWrap,
                      {
                        backgroundColor: status.bg,
                      },
                    ]}
                  >
                    <Ionicons
                      name={status.icon}
                      size={22}
                      color={status.color}
                    />
                  </View>

                  <View style={styles.cardContent}>
                    <View style={styles.cardTop}>
                      <View style={styles.titleRow}>
                        {!isRead && (
                          <View style={styles.unreadDot} />
                        )}

                        <Text style={styles.cardTitle}>
                          {item.title}
                        </Text>
                      </View>

                      <Text style={styles.timeText}>
                        {timeLabel}
                      </Text>
                    </View>

                    <Text style={styles.cardDescription}>
                      {item.message}
                    </Text>
                  </View>
                </TouchableOpacity>
              )
            })
          )}
        </ScrollView>
      </Animated.View>

      <AdminBottomNav activeTab="alert" />
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

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 22,
  },

  title: {
    fontSize: 22,
    color: 'rgb(16, 32, 15)',
    fontFamily: 'Montserrat_700Bold',
  },

  backButton: {
    width: 30,
    height: 30,
    borderRadius: 10,
    backgroundColor: 'rgb(239, 245, 232)',
    justifyContent: 'center',
    alignItems: 'center',
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

  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
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
  markAllText: {
    fontSize: 12,
    color: 'rgb(109, 170, 26)',
    fontFamily: 'Montserrat_600SemiBold',
    marginTop: 2,
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