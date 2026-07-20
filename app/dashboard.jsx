import React, { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Image,
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
import ScreenHeader, { screenLayoutStyles } from './components/ScreenHeader'
import {
  getRecentReportsForDashboard,
  getVolunteerDashboardStats,
} from './utils/dashboardBackend'
import { getStatusLabel } from './utils/shared/reportQuery'
import { useBottomNavMetrics, useResponsiveLayout } from './utils/shared/screenLayout'
import { usePullToRefresh } from './utils/shared/usePullToRefresh'
import { getUserProfile } from './utils/userService'

const QUICK_TOOLS = [
  { key: 'scan', title: 'Scan', icon: 'camera-outline', href: '/camera' },
  { key: 'map', title: 'Map', icon: 'location', href: '/map' },
  { key: 'notification', title: 'Notification', icon: 'notifications', href: '/notification' },
  { key: 'reports', title: 'My Reports', icon: 'time-outline', href: '/profile' },
]

const HERO_LAYOUT = {
  textGap: 2, /** Tight gap between eyebrow, title, and subtitle */
  
  subtitleToButtonGap: 20, /** Gap between subtitle line and CTA button */
  buttonPaddingVertical: 12,  /** Extra height on each horizontal carousel card */
  cardExtraHeight: 30,  /** height sa bse sa carousel box */
}

const HERO_SLIDES = [
  {
    id: 'submit',
    image: require('../assets/mangroves_carousel_1.webp'),
    getEyebrow: (name) => `HI, ${name} 👋`,
    title: 'Protect mangroves with us',
    subtitle: 'Monitor mangroves, protect coastlines',
    ctaText: 'Submit →',
    href: '/camera',
  },
  {
    id: 'map',
    image: require('../assets/mangroves_carousel_2.webp'),
    getEyebrow: () => 'EXPLORE THE MAP',
    title: 'See reports near you',
    subtitle: 'Track unhealthy and healthy mangrove areas',
    ctaText: 'Open Map →',
    href: '/map',
  },
]

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
  const { heroCardWidth, heroMinHeight, rs, isCompact } = useResponsiveLayout()
  const [userName, setUserName] = useState('FRIEND')
  const [avatarUrl, setAvatarUrl] = useState(null)
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({ unhealthy: 0, resolved: 0, myReports: 0 })
  const [recentReports, setRecentReports] = useState([])
  const [activeHeroIndex, setActiveHeroIndex] = useState(0)

  const heroSlides = useMemo(
    () => HERO_SLIDES.map((slide) => ({
      ...slide,
      eyebrow: slide.getEyebrow(userName),
    })),
    [userName]
  )

  const heroResponsive = useMemo(
    () => createHeroResponsiveStyles(rs, heroCardWidth, heroMinHeight),
    [rs, heroCardWidth, heroMinHeight]
  )

  const handleHeroScroll = useCallback((e) => {
    const index = Math.round(e.nativeEvent.contentOffset.x / heroCardWidth)
    const clamped = Math.max(0, Math.min(index, heroSlides.length - 1))
    setActiveHeroIndex((prev) => (prev === clamped ? prev : clamped))
  }, [heroSlides.length, heroCardWidth])

  const loadDashboard = useCallback(async () => {
    const profile = await getUserProfile()
    if (profile?.full_name) {
      const firstName = profile.full_name.trim().split(' ')[0]
      setUserName((firstName || 'Friend').toUpperCase())
      setAvatarUrl(profile.avatar_url || null)
    }

    const [statsResult, reportsResult] = await Promise.allSettled([
      getVolunteerDashboardStats(),
      getRecentReportsForDashboard(5),
    ])

    if (statsResult.status === 'fulfilled') {
      setStats(statsResult.value)
    }

    if (reportsResult.status === 'fulfilled') {
      setRecentReports(reportsResult.value.slice(0, 5))
    }
  }, [])

  const { refreshControl } = usePullToRefresh(loadDashboard)

  useEffect(() => {
    const fetchUser = async () => {
      try {
        await loadDashboard()
      } catch {
        // ignore initial load errors; UI shows empty state
      } finally {
        setLoading(false)
      }
    }

    fetchUser()
  }, [loadDashboard])

  return (
    <SafeAreaView style={screenLayoutStyles.screenContainer} edges={['top', 'left', 'right']}>
      <ScreenHeader
          title="Dashboard"
          right={
            <TouchableOpacity
              style={styles.profileBtn}
              activeOpacity={0.85}
              onPress={() => router.push('/profile')}
              accessibilityLabel="Open profile"
            >
              {avatarUrl ? (
                <Image source={{ uri: avatarUrl }} style={styles.profileImg} />
              ) : (
                <Feather name="user" size={20} color="rgb(48, 64, 24)" />
              )}
            </TouchableOpacity>
          }
        />

        <ScrollView
          style={screenLayoutStyles.scrollView}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[screenLayoutStyles.scrollContent, { paddingBottom: scrollPadding }]}
          refreshControl={refreshControl}
        >
          <View style={styles.heroCarouselWrap}>
            <ScrollView
              horizontal
              pagingEnabled
              decelerationRate="fast"
              showsHorizontalScrollIndicator={false}
              snapToInterval={heroCardWidth}
              snapToAlignment="start"
              bounces={false}
              scrollEventThrottle={16}
              nestedScrollEnabled
              onScroll={handleHeroScroll}
            >
              {heroSlides.map((item) => (
                <View
                  key={item.id}
                  style={[styles.heroCard, heroResponsive.card]}
                >
                  <Image
                    source={item.image}
                    style={[styles.heroLogo, heroResponsive.logo]}
                  />
                  <View style={[styles.heroContent, heroResponsive.content]}>
                    <View style={[styles.heroTextBlock, heroResponsive.textBlock]}>
                      <Text style={[styles.heroEyebrow, heroResponsive.eyebrow]}>{item.eyebrow}</Text>
                      <Text
                        style={[styles.heroTitle, heroResponsive.title]}
                        numberOfLines={isCompact ? 2 : 3}
                      >
                        {item.title}
                      </Text>
                      <Text
                        style={[styles.subtitle, heroResponsive.subtitle]}
                        numberOfLines={2}
                      >
                        {item.subtitle}
                      </Text>
                    </View>
                    <TouchableOpacity
                      activeOpacity={0.88}
                      onPress={() => router.push(item.href)}
                    >
                      <View style={[styles.heroCtaBtn, heroResponsive.heroCtaBtn]}>
                        <Text style={[styles.heroCtaText, heroResponsive.heroCtaText]}>
                          {item.ctaText}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </ScrollView>

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
            {QUICK_TOOLS.map((tool) => (
              <Link key={tool.key} href={tool.href} asChild>
                <TouchableOpacity style={styles.toolCard} activeOpacity={0.88}>
                  <View style={styles.toolIconWrap}>
                    <Ionicons name={tool.icon} size={22} color="rgb(44, 143, 47)" />
                  </View>
                  <Text style={styles.toolTitle}>{tool.title}</Text>
                </TouchableOpacity>
              </Link>
            ))}
          </View>

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

      <BottomNav activeTab="home" />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  profileBtn: {
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
    paddingVertical: 20,  /** para sa box sa hero */
    alignItems: 'flex-start',
  },

  heroContent: {
    alignSelf: 'stretch',
    zIndex: 1,
  },

  heroTextBlock: {
    flexShrink: 1,
    paddingRight: 72,
  },

  heroLogo: {
    position: 'absolute',
    opacity: 0.45,
  },

  heroEyebrow: {
    fontFamily: 'Montserrat_600SemiBold',
    color: 'rgb(67, 113, 5)',
    letterSpacing: 0.15,
  },

  heroTitle: {
    fontFamily: 'Montserrat_700Bold',
    color: 'rgb(15, 27, 15)',
  },

  subtitle: {
    color: 'rgb(55, 65, 81)',
    fontFamily: 'Montserrat_400Regular',
  },

  /** Hero CTA — same look as Sign In button (search: heroCtaBtn) */
  heroCtaBtn: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgb(109, 170, 26)',
    paddingHorizontal: 16,
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: 'rgb(109, 170, 26)',
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },

  heroCtaText: {
    color: 'rgb(255, 255, 255)',
    fontSize: 13,
    fontFamily: 'Montserrat_700Bold',
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
    backgroundColor: 'rgb(109, 170, 26)',
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

  emptyReports: {
    textAlign: 'center',
    color: 'rgb(156, 163, 175)',
    fontFamily: 'Montserrat_400Regular',
    marginBottom: 12,
  },
})

/**
 * Responsive hero sizes — paired with HERO_LAYOUT at top of file.
 * `rs()` scales values per screen width; `gap` uses those scaled values for spacing.
 */
function createHeroResponsiveStyles(rs, heroCardWidth, heroMinHeight) {
  return {
    card: { width: heroCardWidth, minHeight: heroMinHeight + rs(HERO_LAYOUT.cardExtraHeight) },
    logo: {
      width: rs(170),
      height: rs(140),
      right: rs(-36),
      bottom: rs(-18),
    },
    content: { gap: rs(HERO_LAYOUT.subtitleToButtonGap) },
    textBlock: { gap: rs(HERO_LAYOUT.textGap) },
    eyebrow: { fontSize: rs(12) },
    title: { fontSize: rs(14), lineHeight: rs(18) },
    subtitle: { fontSize: rs(11), lineHeight: rs(14) },
    heroCtaBtn: { paddingVertical: rs(HERO_LAYOUT.buttonPaddingVertical) },
    heroCtaText: { fontSize: rs(13) },
  }
}