
import { Feather, Ionicons } from '@expo/vector-icons'
import { Link, useRouter } from 'expo-router'
import React, { useEffect, useRef, useState } from 'react'
import { Animated, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { getAdminProfile, getAdminStats, getRecentAdminActivity } from '../utils/adminDashboardBackend'
import { useBottomNavMetrics } from '../utils/shared/screenLayout'
import AdminBottomNav from './AdminBottomNav'
const ADMIN_TOOLS = [
  {
    key: 'verify',
    title: 'Verification',
    icon: 'shield-checkmark-outline',
    href: '/admin/admin_verify',
  },
  {
    key: 'map',
    title: 'Monitor Map',
    icon: 'location-outline',
    href: '/admin/admin_map',
  },
  {
    key: 'alerts',
    title: 'View Alerts',
    icon: 'notifications-outline',
    href: '/admin/admin_notification',
  },
  {
    key: 'profile',
    title: 'Admin Profile',
    icon: 'person-outline',
    href: '/admin/admin_profile',
  },
]

const ADMIN_STATS = [
  {
    key: 'pending',
    label: 'PENDING',
    bg: 'rgb(255, 242, 217)',
    borderColor: 'rgb(245, 217, 168)',
    valueColor: 'rgb(201, 138, 0)',
  },
  {
    key: 'verified',
    label: 'VERIFIED',
    bg: 'rgb(221, 243, 214)',
    borderColor: 'rgb(184, 230, 176)',
    valueColor: 'rgb(45, 160, 49)',
  },
  {
    key: 'alerts',
    label: 'ALERTS',
    bg: 'rgb(255, 231, 231)',
    borderColor: 'rgb(255, 209, 209)',
    valueColor: 'rgb(255, 59, 48)',
  },
]

export default function AdminDashboard() {
  const router = useRouter();
  const { scrollPadding } = useBottomNavMetrics()
  const fadeAnim = useRef(new Animated.Value(0)).current
  const slideAnim = useRef(new Animated.Value(10)).current
  const [adminName, setAdminName] = useState('Admin')
  const [avatarUrl, setAvatarUrl] = useState(null)
  const [stats, setStats] = useState({ pending: 0, verified: 0, alerts: 0 })
  const [recentActivity, setRecentActivity] = useState([])

  useEffect(() => {
    const fetchAdminData = async () => {
      try {
        const profile = await getAdminProfile()
        if (profile) {
          const fullName = profile.full_name || 'Admin'
          const firstName = fullName.trim().split(/\s+/)[0]
          setAdminName(firstName)
          setAvatarUrl(profile.avatar_url || null)
        }

        const dashboardStats = await getAdminStats()
        setStats(dashboardStats)

        const activity = await getRecentAdminActivity(5)
        setRecentActivity(activity)
      } catch (error) {
        console.error('Error fetching admin data:', error)
      }
    }
    fetchAdminData()
  }, [])

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

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <Animated.View style={{ flex: 1, opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.content, { paddingBottom: scrollPadding }]}
        >
          <View style={styles.header}>
            <Text style={styles.title}>Admin Dashboard</Text>
            <TouchableOpacity 
              style={styles.settingsBtn} 
              activeOpacity={0.85}
              onPress={() => router.push('/admin/admin_profile')}
            >
              {avatarUrl ? (
                <Image source={{ uri: avatarUrl }} style={styles.profileImg} />
              ) : (
                <Feather name="user" size={20} color="rgb(48, 64, 24)" />
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.heroCard}>
            <Image
              source={require('../../assets/mangroves_carousel_1.webp')}
              style={styles.heroLogo}
            />
            <View style={styles.heroContent}>
              <Text style={styles.heroEyebrow}>
                ADMIN, {adminName.toUpperCase()} 👋
              </Text>
              <Text style={styles.heroTitle}>Manage Mangrove Health{'\n'}</Text>
              <Text style={styles.subtitle}>
                Review reports and monitor ecosystems
              </Text>
              <Link href="/admin/admin_verify" asChild>
                <TouchableOpacity style={styles.submitBtn} activeOpacity={0.88}>
                  <Text style={styles.submitText}>Verify Reports →</Text>
                </TouchableOpacity>
              </Link>
            </View>
          </View>

          <View style={styles.statsRow}>
            {ADMIN_STATS.map((item) => (
              <View
                key={item.key}
                style={[
                  styles.statCard,
                  { backgroundColor: item.bg, borderColor: item.borderColor },
                ]}
              >
                <Text style={[styles.statValue, { color: item.valueColor }]}>
                  {stats[item.key]}
                </Text>
                <Text style={styles.statLabel}>{item.label}</Text>
              </View>
            ))}
          </View>

          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Admin Tools</Text>
          </View>

          <View style={styles.toolsGrid}>
            {ADMIN_TOOLS.map((tool) => (
              <TouchableOpacity 
                key={tool.key} 
                style={styles.toolCard} 
                activeOpacity={0.88}
                onPress={() => router.push(tool.href)}
              >
                <View style={styles.toolIconWrap}>
                  <Ionicons name={tool.icon} size={22} color="rgb(44, 143, 47)" />
                </View>
                <Text style={styles.toolTitle}>{tool.title}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Activity</Text>
            <TouchableOpacity onPress={() => router.push('/admin/admin_notification')}>
              <Text style={styles.seeAllText}>View All</Text>
            </TouchableOpacity>
          </View>

          {recentActivity.length === 0 ? (
            <Text style={styles.emptyActivity}>No recent activity yet.</Text>
          ) : (
          recentActivity.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={styles.activityCard}
              activeOpacity={0.85}
              onPress={() => router.push({ pathname: '/admin/admin_verify', params: { reportId: item.id } })}
            >
              <View style={[
                styles.statusHeader,
                item.status === 'pending' ? styles.reviewBanner :
                item.status === 'under_review' ? styles.activeBanner :
                styles.resolvedBanner
              ]}>
                <Text style={[
                  styles.statusHeaderText,
                  { color: item.status === 'pending' ? 'rgb(201, 138, 0)' : item.status === 'under_review' ? 'rgb(255, 59, 48)' : 'rgb(45, 160, 49)' }
                ]}>
                  {item.statusLabel?.toUpperCase()}
                </Text>
              </View>

              <View style={styles.activityBody}>
                <Image
                  source={item.image_url ? { uri: item.image_url } : require('../../assets/mangroves_carousel_1.webp')}
                  style={styles.reportImage}
                />
                <View style={styles.activityInfo}>
                  <Text style={styles.adminNameText}>{item.species}</Text>
                  <View style={styles.locationRow}>
                    <Ionicons name="location-outline" size={12} color="rgb(123, 129, 119)" />
                    <Text style={styles.reportLocation}>{item.formatted_address || 'Unknown'}</Text>
                  </View>
                  <View style={styles.healthRow}>
                    <View style={[styles.healthDot, { backgroundColor: item.health_status === 'healthy' ? 'rgb(45, 160, 49)' : 'rgb(255, 59, 48)' }]} />
                    <Text style={[styles.healthText, { color: item.health_status === 'healthy' ? 'rgb(45, 160, 49)' : 'rgb(255, 59, 48)' }]}>
                      {item.health_status || 'unknown'}
                    </Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={18} color="rgb(209, 213, 219)" />
              </View>
            </TouchableOpacity>
          ))
          )}
        </ScrollView>
      </Animated.View>

      <AdminBottomNav activeTab="home" />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'rgb(251, 252, 247)',
  },
  content: {
    paddingHorizontal: 14,
    paddingTop: 18,
    paddingBottom: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    marginBottom: 16,
  },
  title: {
    fontSize: 22,
    color: 'rgb(16, 32, 15)',
    fontFamily: 'Montserrat_700Bold',
  },
  settingsBtn: {
    width: 33,
    height: 33,
    borderRadius: 20,
    backgroundColor: 'rgb(109, 170, 26)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileImg: {
    width: 30,
    height: 30,
    borderRadius: 20,
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 15,
    backgroundColor: 'rgb(239, 245, 232)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroCard: {
    width: '100%',
    borderRadius: 18,
    backgroundColor: 'rgb(207, 239, 199)',
    overflow: 'hidden',
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 20,
  },
  heroContent: {
    zIndex: 1,
  },
  heroLogo: {
    position: 'absolute',
    right: -40,
    bottom: -40,
    width: 200,
    height: 170,
    opacity: 0.45,
  },
  heroEyebrow: {
    fontSize: 12,
    fontFamily: 'Montserrat_600SemiBold',
    color: 'rgb(67, 113, 5)',
    letterSpacing: 0.15,
  },
  heroTitle: {
    fontSize: 14,
    fontFamily: 'Montserrat_700Bold',
    lineHeight: 24,
    color: 'rgb(15, 27, 15)',
    marginTop: 2,
  },
  subtitle: {
    fontSize: 11,
    color: 'rgb(55, 65, 81)',
    lineHeight: 14,
    fontFamily: 'Montserrat_400Regular',
    bottom: 18,
  },
  submitBtn: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgb(52, 162, 50)',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    marginTop: 10,
  },
  submitText: {
    color: 'rgb(255, 255, 255)',
    fontSize: 13,
    fontFamily: 'Montserrat_600SemiBold',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  statCard: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 6,
  },
  statValue: {
    fontSize: 24,
    fontFamily: 'Montserrat_700Bold',
    marginBottom: 4,
    letterSpacing: -0.3,
  },
  statLabel: {
    fontSize: 10,
    letterSpacing: 0.9,
    color: 'rgb(110, 117, 106)',
    fontFamily: 'Montserrat_600SemiBold',
    textAlign: 'center',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'Montserrat_700Bold',
    color: 'rgb(16, 32, 15)',
  },
  seeAllText: {
    fontSize: 14,
    fontFamily: 'Montserrat_600SemiBold',
    color: 'rgb(52, 162, 50)',
  },
  toolsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 10,
  },
  toolCard: {
    width: '48%',
    minHeight: 94,
    borderRadius: 16,
    backgroundColor: 'rgb(255, 255, 255)',
    borderWidth: 1,
    padding: 12,
    borderColor: 'rgb(232, 236, 221)',
    justifyContent: 'space-between',
    elevation: 1,
  },
  toolIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: 'rgb(221, 243, 214)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  toolTitle: {
    fontSize: 13,
    color: 'rgb(67, 113, 5)',
    fontFamily: 'Montserrat_600SemiBold',
  },
  activityCard: {
    backgroundColor: 'rgb(255, 255, 255)',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgb(232, 236, 221)',
    marginBottom: 12,
    overflow: 'hidden',
  },
  statusHeader: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    alignItems: 'flex-start',
  },
  statusHeaderText: {
    fontSize: 10,
    fontFamily: 'Montserrat_700Bold',
    letterSpacing: 1,
  },
  activityBody: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
  },
  reportImage: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgb(251, 252, 247)',
  },
  activityInfo: {
    flex: 1,
    marginLeft: 14,
  },
  reportLocation: {
    fontSize: 12,
    color: 'rgb(123, 129, 119)',
    fontFamily: 'Montserrat_400Regular',
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  adminNameText: {
    fontSize: 13,
    color: 'rgb(16, 32, 15)',
    fontFamily: 'Montserrat_500Medium',
  },
  healthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  healthDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  healthText: {
    fontSize: 11,
    fontFamily: 'Montserrat_600SemiBold',
  },
  activeBanner: { backgroundColor: 'rgb(255, 231, 231)' },
  resolvedBanner: { backgroundColor: 'rgb(221, 243, 214)' },
  reviewBanner: { backgroundColor: 'rgb(255, 242, 217)' },
  emptyActivity: {
    textAlign: 'center',
    color: 'rgb(156, 163, 175)',
    fontFamily: 'Montserrat_400Regular',
    marginTop: 8,
  },
})




