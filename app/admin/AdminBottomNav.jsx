import React, { useState, useEffect } from 'react'
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native'
import { Ionicons, Feather } from '@expo/vector-icons'
import { Link } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import {
  BOTTOM_NAV_CONTENT_HEIGHT,
  BOTTOM_NAV_MIN_INSET,
} from '../utils/shared/screenLayout'
import { supabase } from '../../supabaseClient'
import { getUnreadAdminNotificationsCount, subscribeToAdminNotifications } from '../utils/adminNotificationBackend'

const TABS = [
  {
    key: 'home',
    label: 'Home',
    icon: 'home',
    href: '/admin/admin_dashboard',
  },
  {
    key: 'map',
    label: 'Map',
    icon: 'map',
    href: '/admin/admin_map',
  },
  {
    key: 'verify',
    icon: 'shield-checkmark-outline',
    href: '/admin/admin_verify',
    isCenter: true,
  },
  {
    key: 'alert',
    label: 'Alert',
    icon: 'bell',
    href: '/admin/admin_notification',
  },
  {
    key: 'profile',
    label: 'Profile',
    icon: 'user',
    href: '/admin/admin_profile',
  },
]

export default function AdminBottomNav({ activeTab = 'home' }) {
  const [unreadCount, setUnreadCount] = useState(0)
  const insets = useSafeAreaInsets()

  useEffect(() => {
    let subscription = null
    const setup = async () => {
      const { data: authData } = await supabase.auth.getUser()
      const user = authData?.user
      if (!user) return
      
      const count = await getUnreadAdminNotificationsCount()
      setUnreadCount(count)
      
      subscription = subscribeToAdminNotifications(user.id, async () => {
        const updatedCount = await getUnreadAdminNotificationsCount()
        setUnreadCount(updatedCount)
      }, 'badge')
    }
    setup()
    return () => { if (subscription) supabase.removeChannel(subscription) }
  }, [])

  return (
    <View style={[styles.bottomNav, { paddingBottom: Math.max(insets.bottom, BOTTOM_NAV_MIN_INSET), height: BOTTOM_NAV_CONTENT_HEIGHT + Math.max(insets.bottom, BOTTOM_NAV_MIN_INSET) }]}>
        {TABS.map((tab) => {
          const isActive = activeTab === tab.key

          if (tab.isCenter) {
            return (
              <Link key={tab.key} href={tab.href} asChild>
                <TouchableOpacity
                  style={styles.cameraWrapper}
                  activeOpacity={0.86}
                >
                  <View style={styles.cameraBackground}>
                    <View style={styles.cameraButton}>
                      <Ionicons
                        name="shield-checkmark-outline"
                        size={20}
                        color="rgb(255, 255, 255)"
                      />
                    </View>
                  </View>
                </TouchableOpacity>
              </Link>
            )
          }

          return (
            <Link key={tab.key} href={tab.href} asChild>
              <TouchableOpacity
                style={styles.navItem}
                activeOpacity={0.8}
              >
                <View style={styles.navIconWrap}>
                  <Feather
                    name={tab.icon}
                    size={18}
                    color={isActive ? 'rgb(61, 95, 24)' : 'rgb(184, 190, 179)'}
                  />

                  {tab.key === 'alert' && unreadCount > 0 && (
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>{unreadCount}</Text>
                    </View>
                  )}
                </View>

                <Text
                  style={[
                    styles.navText,
                    isActive && styles.activeNavText,
                  ]}
                >
                  {tab.label}
                </Text>
              </TouchableOpacity>
            </Link>
          )
        })}
    </View>
  )
}

const styles = StyleSheet.create({
  bottomNav: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgb(255, 255, 255)',
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: 'rgb(240, 242, 232)',
  },

  navItem: {
    width: '20%',
    alignItems: 'center',
    justifyContent: 'center',
  },

  navIconWrap: {
    width: 22,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },

  navText: {
    marginTop: 4,
    fontSize: 10,
    color: 'rgb(142, 149, 138)',
  },

  activeNavText: {
    color: 'rgb(61, 95, 24)',
  },

  cameraWrapper: {
    width: '20%',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -30,
  },

  cameraBackground: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgb(255, 255, 255)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  cameraButton: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: 'rgb(62, 170, 43)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  badge: {
    position: 'absolute',
    top: -4,
    right: -6,
    backgroundColor: 'rgb(255, 77, 79)',
    width: 14,
    height: 14,
    borderRadius: 7,
    justifyContent: 'center',
    alignItems: 'center',
  },

  badgeText: {
    color: 'rgb(255, 255, 255)',
    fontSize: 8,
  },
})