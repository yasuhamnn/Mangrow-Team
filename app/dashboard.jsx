import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Animated,
  Dimensions,
  FlatList,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { Feather, Ionicons } from '@expo/vector-icons'
import { Link, useRouter } from 'expo-router'
import AdaptiveLocationText from './components/AdaptiveLocationText'
import BottomNav from './components/BottomNav'
import {
  getRecentReportsForDashboard,
  getVolunteerDashboardStats,
} from './utils/dashboardBackend'
import { getStatusLabel } from './utils/shared/reportQuery'
import { useBottomNavMetrics } from './utils/shared/screenLayout'
import { getUserProfile } from './utils/userService'

const QUICK_TOOLS = [
  { key: 'scan', title: 'Scan', icon: 'camera-outline', href: '/camera' },
  { key: 'map', title: 'Map', icon: 'location', href: '/map' },
  { key: 'notification', title: 'Notification', icon: 'notifications', href: '/notification' },
  { key: 'reports', title: 'My Reports', icon: 'time-outline', href: '/profile' },
]

const HERO_SLIDES = [
  {
    id: 'submit',
    image: require('../assets/mangroves_carousel_1.webp'),
    getEyebrow: (name) => `HI, ${name} 👋`,
    title: 'Protect mangroves with us\n',
    subtitle: 'Monitor mangroves, protect coastlines',
    ctaText: 'Submit →',
    href: '/camera',
  },
  {
    id: 'map',
    image: require('../assets/mangroves_carousel_2.webp'),
    getEyebrow: () => 'EXPLORE THE MAP',
    title: 'See reports near you\n',
    subtitle: 'Track unhealthy and healthy mangrove areas',
    ctaText: 'Open Map →',
    href: '/map',
  },
]

const SCREEN_WIDTH = Dimensions.get('window').width
const HERO_CARD_WIDTH = SCREEN_WIDTH - 28

const DASHBOARD_STATS = [
  {
    key: 'unhealthy',
    label: 'UNHEALTHY',
    bg: 'rgb(255, 231, 231)',
    borderColor: 'rgb(255, 209, 209)',
    valueColor: 'rgb(255, 59, 48)',
  },
  {
    key: 'resolved',
    label: 'RESOLVED',
    bg: 'rgb(221, 243, 214)',
    borderColor: 'rgb(184, 230, 176)',
    valueColor: 'rgb(45, 160, 49)',
  },
  {
    key: 'myReports',
    label: 'MY REPORT',
    bg: 'rgb(255, 242, 217)',
    borderColor: 'rgb(245, 217, 168)',
    valueColor: 'rgb(201, 138, 0)',
  },
]

export default function Dashboard() {
  const router = useRouter()
  const { scrollPadding } = useBottomNavMetrics()
  const [userName, setUserName] = useState('FRIEND')
  const [avatarUrl, setAvatarUrl] = useState(null)
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({ unhealthy: 0, resolved: 0, myReports: 0 })
  const [recentReports, setRecentReports] = useState([])
  const fadeAnim = useRef(new Animated.Value(0)).current
  const slideAnim = useRef(new Animated.Value(10)).current
  const [isProfileModalVisible, setIsProfileModalVisible] = useState(false)
  const [activeHeroIndex, setActiveHeroIndex] = useState(0)

  const heroSlides = useMemo(
    () => HERO_SLIDES.map((slide) => ({
      ...slide,
      eyebrow: slide.getEyebrow(userName),
    })),
    [userName]
  )

  const handleHeroScroll = useCallback((e) => {
    const index = Math.round(e.nativeEvent.contentOffset.x / HERO_CARD_WIDTH)
    const clamped = Math.max(0, Math.min(index, heroSlides.length - 1))
    setActiveHeroIndex((prev) => (prev === clamped ? prev : clamped))
  }, [heroSlides.length])

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const profile = await getUserProfile()
        if (profile) {
          const firstName = profile.full_name.trim().split(' ')[0]
          setUserName(firstName.toUpperCase())
          if (profile.avatar_url) {
            setAvatarUrl(profile.avatar_url)
          }
        }

        const [dashboardStats, reports] = await Promise.all([
          getVolunteerDashboardStats(),
          getRecentReportsForDashboard(5),
        ])
        setStats(dashboardStats)
        setRecentReports(reports.slice(0, 5))
      } finally {
        setLoading(false)
      }
    }

    fetchUser()

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
            <View style={styles.brandWrap}>
              <Text style={styles.brandText}>Dashboard</Text>
            </View>

            <TouchableOpacity 
              style={styles.settingsBtn} 
              activeOpacity={0.85}
              onPress={() => setIsProfileModalVisible(true)}
            >
              {avatarUrl ? (
                <Image source={{ uri: avatarUrl }} style={styles.profileImg} />
              ) : (
                <Feather name="user" size={20} color="rgb(48, 64, 24)" />
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.heroCarouselWrap}>
            <FlatList
              data={heroSlides}
              keyExtractor={(item) => item.id}
              horizontal
              pagingEnabled
              decelerationRate="fast"
              showsHorizontalScrollIndicator={false}
              snapToInterval={HERO_CARD_WIDTH}
              snapToAlignment="start"
              bounces={false}
              scrollEventThrottle={16}
              onScroll={handleHeroScroll}
              renderItem={({ item }) => (
                <View style={[styles.heroCard, { width: HERO_CARD_WIDTH }]}>
                  <Image
                    source={item.image}
                    style={styles.heroLogo}
                  />
                  <View style={styles.heroContent}>
                    <Text style={styles.heroEyebrow}>{item.eyebrow}</Text>
                    <Text style={styles.heroTitle}>{item.title}</Text>
                    <Text style={styles.subtitle}>{item.subtitle}</Text>
                    <Link href={item.href} asChild>
                      <TouchableOpacity style={styles.submitBtn} activeOpacity={0.88}>
                        <Text style={styles.submitText}>{item.ctaText}</Text>
                      </TouchableOpacity>
                    </Link>
                  </View>
                </View>
              )}
            />

            <View style={styles.heroDotsRow}>
              {heroSlides.map((slide, index) => (
                <View
                  key={slide.id}
                  style={[styles.heroDot, activeHeroIndex === index && styles.heroDotActive]}
                />
              ))}
            </View>
          </View>

          <View style={styles.statsRow}>
            {DASHBOARD_STATS.map((item) => (
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
            <Text style={styles.sectionTitle}>Quick Tools</Text>
          </View>

          <View style={styles.toolsGrid}>
            {QUICK_TOOLS.map((tool) => {
              const cardContent = (
                <>
                  <View style={styles.toolIconWrap}>
                    <Ionicons name={tool.icon} size={22} color="rgb(44, 143, 47)" />
                  </View>
                  <Text style={styles.toolTitle}>{tool.title}</Text>
                </>
              );

              if (tool.href) {
                return (
                  <Link key={tool.key} href={tool.href} asChild>
                    <TouchableOpacity style={styles.toolCard} activeOpacity={0.88}>
                      {cardContent}
                    </TouchableOpacity>
                  </Link>
                );
              }

              return (
                <TouchableOpacity key={tool.key} style={styles.toolCard} activeOpacity={0.88}>
                  {cardContent}
                </TouchableOpacity>
              );
            })}
          </View>

          {/* --- Recent Reports Section --- */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Reports</Text>
            <TouchableOpacity onPress={() => router.push({ pathname: '/map', params: { scrollToList: '1' } })}>
              <Text style={styles.seeAllText}>See All</Text>
            </TouchableOpacity>
          </View>

          {recentReports.length === 0 && !loading ? (
            <Text style={styles.emptyReports}>No reports yet. Submit your first report!</Text>
          ) : (
          recentReports.map((report) => (
            <TouchableOpacity
              key={report.id}
              style={styles.reportCard}
              onPress={() => router.push({ pathname: '/report_details', params: { id: report.id } })}
              activeOpacity={0.85}
            >
              <Image 
                source={
                  report.image_url ? { uri: report.image_url } : 
                  report.image_uri ? { uri: report.image_uri } : 
                  require('../assets/mangroves_carousel_1.webp')
                } 
                style={styles.reportImage} 
              />

              <View style={styles.reportContent}>
                <Text style={styles.reportSpecies}>{report.species || 'Unknown Species'}</Text>
                <View style={styles.locationRow}>
                  <Ionicons name="location-outline" size={12} color="rgb(67, 113, 5)" />
                  <AdaptiveLocationText
                    text={report.formatted_address || `${report.latitude}, ${report.longitude}`}
                    color="rgb(123, 129, 119)"
                  />
                </View>

                <View style={styles.reportFooter}>
                  <View style={styles.healthRow}>
                    <View
                      style={[
                        styles.healthDot,
                        { backgroundColor: report.health_status === 'healthy' ? 'rgb(45, 160, 49)' : 'rgb(255, 77, 79)' },
                      ]}
                    />
                    <Text
                      style={[
                        styles.healthText,
                        { color: report.health_status === 'healthy' ? 'rgb(45, 160, 49)' : 'rgb(255, 77, 79)' },
                      ]}
                    >
                      {report.health_status || 'unhealthy'}
                    </Text>
                  </View>

                  <View
                    style={[
                      styles.statusBadge,
                      report.status === 'resolved'
                        ? styles.resolvedBadge
                        : report.status === 'under_review'
                          ? styles.activeBadge
                          : styles.reviewBadge,
                    ]}
                  >
                    <Text style={styles.statusText}>{getStatusLabel(report.status)}</Text>
                  </View>
                </View>
              </View>

              <Ionicons name="chevron-forward" size={20} color="rgb(209, 213, 219)" />
            </TouchableOpacity>
          ))
          )}
        </ScrollView>
      </Animated.View>

      {/* Profile Picture Popup Modal */}
      <Modal
        visible={isProfileModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setIsProfileModalVisible(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay} 
          activeOpacity={1} 
          onPress={() => setIsProfileModalVisible(false)}
        >
          <View style={styles.modalContent}>
            {avatarUrl ? (
              <Image source={{ uri: avatarUrl }} style={styles.fullProfileImg} />
            ) : (
              <View style={styles.placeholderAvatar}>
                <Feather name="user" size={80} color="rgb(48, 64, 24)" />
              </View>
            )}
            <TouchableOpacity 
              style={styles.closeModalBtn}
              onPress={() => setIsProfileModalVisible(false)}
            >
              <Ionicons name="close-circle" size={48} color="rgb(255, 255, 255)" />
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      <BottomNav activeTab="home" />
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
    marginBottom: 16,
  },

  brandWrap: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  brandText: {
    fontSize: 22,
    fontFamily: 'Montserrat_700Bold',
    color: 'rgb(16, 32, 15)',
    letterSpacing: -0.3,
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

  heroCarouselWrap: {
    marginBottom: 20,
  },

  heroCard: {
    borderRadius: 18,
    backgroundColor: 'rgb(207, 239, 199)',
    overflow: 'hidden',
    flexDirection: 'column',
    paddingHorizontal: 14,
    paddingVertical: 12,
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    minHeight: 148,
  },

  heroContent: {
    flex: 1,
    alignSelf: 'stretch',
    justifyContent: 'flex-start',
  },

  heroLogo: {
    position: 'absolute',
    right: -40,
    bottom: -20,
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
    fontWeight: '400',
    bottom: 18,
  },

  submitBtn: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
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
    lineHeight: 15,
    letterSpacing: -0.1,
  },

  heroDotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    marginTop: 10,
  },

  heroDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgb(197, 212, 188)',
  },

  heroDotActive: {
    width: 18,
    backgroundColor: 'rgb(52, 162, 50)',
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
    lineHeight: 26,
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
    lineHeight: 22,
    color: 'rgb(16, 32, 15)',
    letterSpacing: -0.25,
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
    /* subtle shadow similar to statCard */
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 10,
    borderColor: 'rgb(232, 236, 221)',
    justifyContent: 'space-between',
    shadowColor: 'rgb(167, 177, 149)',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 1,
  },

  toolIconWrap: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: 'rgb(221, 243, 214)',
    /* ensure no border */
    borderWidth: 0,
    borderColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },

  toolTitle: {
    fontSize: 13,
    lineHeight: 15,
    color: 'rgb(67, 113, 5)',
    fontFamily: 'Montserrat_600SemiBold',
    letterSpacing: -0.15,
    maxWidth: 90,
  },

  reportCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgb(255, 255, 255)',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgb(232, 236, 221)',
    padding: 12,
    marginBottom: 12,
  },

  reportImage: {
    width: 56,
    height: 56,
    borderRadius: 10,
    backgroundColor: 'rgb(243, 244, 246)',
  },

  reportContent: {
    flex: 1,
    marginLeft: 12,
  },

  reportSpecies: {
    fontSize: 14,
    color: 'rgb(16, 32, 15)',
    fontFamily: 'Montserrat_700Bold',
  },

  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 1,
    marginTop: 2,
  },

  reportLocation: {
    fontSize: 11,
    color: 'rgb(123, 129, 119)',
    fontFamily: 'Montserrat_400Regular',
  },

  reportFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },

  healthRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  healthDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },

  healthText: {
    fontSize: 12,
    fontFamily: 'Montserrat_600SemiBold',
  },

  statusBadge: {
    marginLeft: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },

  activeBadge: { backgroundColor: 'rgb(255, 231, 231)' },
  resolvedBadge: { backgroundColor: 'rgb(221, 243, 214)' },
  reviewBadge: { backgroundColor: 'rgb(255, 242, 217)' },

  statusText: {
    fontSize: 10,
    fontFamily: 'Montserrat_600SemiBold',
    color: 'rgb(16, 32, 15)',
  },

  reportBadge: {
    position: 'absolute',
    top: -4,
    right: -2,
    width: 13,
    height: 13,
    borderRadius: 7,
    backgroundColor: 'rgb(255, 122, 47)',
    borderWidth: 1.25,
    borderColor: 'rgb(255, 255, 255)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullProfileImg: {
    width: 280,
    height: 280,
    borderRadius: 140,
    borderWidth: 4,
    borderColor: 'rgb(255, 255, 255)',
  },
  placeholderAvatar: {
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: 'rgb(239, 245, 232)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: 'rgb(255, 255, 255)',
  },
  closeModalBtn: {
    marginTop: 30,
  },
  emptyReports: {
    textAlign: 'center',
    color: 'rgb(156, 163, 175)',
    fontFamily: 'Montserrat_400Regular',
    marginBottom: 12,
  },
})