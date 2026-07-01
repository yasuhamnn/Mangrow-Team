import React, { useEffect, useState } from 'react'
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { getReportById } from './utils/reportDetailsBackend'
import { getActiveResolutionForReport } from './utils/volunteerResolutionSubmitBackend'
import { getStatusLabel } from './utils/shared/reportQuery'
import ImageViewerModal from './components/ImageViewerModal'
import AdaptiveLocationText from './components/AdaptiveLocationText'

export default function ReportDetails() {
  const router = useRouter()
  const { id } = useLocalSearchParams()
  const [report, setReport] = useState(null)
  const [activeResolution, setActiveResolution] = useState(null)
  const [loading, setLoading] = useState(true)
  const [viewerOpen, setViewerOpen] = useState(false)
  const [viewerIndex, setViewerIndex] = useState(0)
  const insets = useSafeAreaInsets()
  const bottomSafePadding = Math.max(insets.bottom, 16)

  const allImages = report
    ? [report.image_url, ...(report.attachments?.map(a => a.image_url) || [])].filter(Boolean)
    : []

  const openViewer = (index) => {
    setViewerIndex(index)
    setViewerOpen(true)
  }

  useEffect(() => {
    let mounted = true

    const load = async () => {
      try {
        setLoading(true)
        const data = await getReportById(id)
        if (mounted) setReport(data)
        const resolution = await getActiveResolutionForReport(id)
        if (mounted) setActiveResolution(resolution)
      } catch (e) {
        Alert.alert('Error', e?.message || 'Failed to load report.')
        if (mounted) router.back()
      } finally {
        if (mounted) setLoading(false)
      }
    }

    if (id) load()
    return () => { mounted = false }
  }, [id])

  const onRequestResolution = () => {
    router.push({ pathname: '/report_resolution_track', params: { reportId: id } })
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
        <ActivityIndicator size="large" color="rgb(109, 170, 26)" style={{ marginTop: 40 }} />
      </SafeAreaView>
    )
  }

  if (!report) return null

  const statusLabel = getStatusLabel(report.status)
  const showTrackButton = report.status === 'under_review' && !activeResolution
  const scrollBottomPadding = showTrackButton
    ? bottomSafePadding + 72
    : activeResolution
      ? bottomSafePadding + 56
      : bottomSafePadding + 16

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: scrollBottomPadding }]}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={18} color="rgb(16, 32, 15)" />
          </TouchableOpacity>
          <Text style={styles.title}>Report Details</Text>
          <View style={{ width: 38 }} />
        </View>

        <View style={styles.card}>
          <TouchableOpacity activeOpacity={0.9} onPress={() => openViewer(0)}>
            <Image
              source={report.image_url ? { uri: report.image_url } : require('../assets/mangroves_carousel_1.webp')}
              style={styles.heroImage}
            />
          </TouchableOpacity>

          <Text style={styles.species}>{report.species}</Text>

          <View style={styles.badgeRow}>
            <View style={styles.statusBadge}>
              <Text style={styles.statusText}>{statusLabel}</Text>
            </View>
            <View style={styles.healthRow}>
              <View
                style={[
                  styles.healthDot,
                  { backgroundColor: report.health_status === 'healthy' ? 'rgb(45, 160, 49)' : 'rgb(255, 77, 79)' },
                ]}
              />
              <Text style={styles.healthText}>{report.health_status || 'unknown'}</Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <Ionicons name="location-outline" size={16} color="rgb(16, 32, 15)" />
            <AdaptiveLocationText text={report.formatted_address || 'Unknown location'} color="rgb(55, 65, 81)" />
          </View>

          <View style={styles.infoRow}>
            <Ionicons name="calendar-outline" size={16} color="rgb(16, 32, 15)" />
            <Text style={styles.infoText}>
              {report.created_at ? new Date(report.created_at).toLocaleString() : '—'}
            </Text>
          </View>

          <Text style={styles.coords}>
            {report.latitude}, {report.longitude}
          </Text>

          <View style={styles.notesBox}>
            <Text style={styles.notesTitle}>Field notes</Text>
            <Text style={styles.notesBody}>{report.field_notes || 'No notes provided.'}</Text>
            {report.attachments?.length > 0 && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.attachmentsScroll}>
                {report.attachments.map((item, i) => (
                  <TouchableOpacity key={item.id} activeOpacity={0.9} onPress={() => openViewer(i + 1)}>
                    <Image source={{ uri: item.image_url }} style={styles.attachmentImage} />
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
          </View>
        </View>

        {report.status === 'rejected' && (
          <TouchableOpacity
            style={styles.rejectionBanner}
            onPress={() => router.push({ pathname: '/report_rejection_feedback', params: { id } })}
            activeOpacity={0.85}
          >
            <Ionicons name="alert-circle" size={22} color="rgb(180, 35, 24)" />
            <View style={{ flex: 1 }}>
              <Text style={styles.rejectionBannerTitle}>View admin feedback</Text>
              <Text style={styles.rejectionBannerBody}>
                This report was not approved. Tap to see why and what to do next.
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="rgb(180, 35, 24)" />
          </TouchableOpacity>
        )}

      </ScrollView>

      {showTrackButton && (
        <View style={[styles.buttonDock, { paddingBottom: bottomSafePadding }]}>
          <TouchableOpacity
            style={styles.trackButton}
            onPress={onRequestResolution}
            activeOpacity={0.85}
          >
            <Text style={styles.trackButtonText}>Track location →</Text>
          </TouchableOpacity>
        </View>
      )}

      {activeResolution && (
        <View style={[styles.pendingBanner, { marginBottom: bottomSafePadding }]}>
          <Ionicons name="time" size={18} color="rgb(201, 138, 0)" />
          <Text style={styles.pendingBannerText}>
            Your resolution is {activeResolution.status === 'under_review' ? 'in admin review' : 'awaiting admin review'}.
          </Text>
        </View>
      )}

      <ImageViewerModal
        visible={viewerOpen}
        images={allImages}
        index={viewerIndex}
        onClose={() => setViewerOpen(false)}
        onIndexChange={setViewerIndex}
      />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'rgb(251, 252, 247)' },
  content: { padding: 16 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  backButton: {
    width: 30,
    height: 30,
    borderRadius: 10,
    backgroundColor: 'rgb(239, 245, 232)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { fontSize: 20, fontFamily: 'Montserrat_700Bold', color: 'rgb(16, 32, 15)' },
  card: {
    backgroundColor: 'rgb(255, 255, 255)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgb(232, 236, 221)',
    padding: 16,
  },
  heroImage: { width: '100%', height: 220, borderRadius: 16, marginBottom: 14 },
  species: { fontSize: 18, fontFamily: 'Montserrat_700Bold', color: 'rgb(16, 32, 15)', marginBottom: 10 },
  badgeRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  statusBadge: { backgroundColor: 'rgb(255, 242, 217)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  statusText: { fontSize: 11, fontFamily: 'Montserrat_600SemiBold', color: 'rgb(16, 32, 15)' },
  healthRow: { flexDirection: 'row', alignItems: 'center' },
  healthDot: { width: 8, height: 8, borderRadius: 4, marginRight: 6 },
  healthText: { fontSize: 12, fontFamily: 'Montserrat_600SemiBold', color: 'rgb(16, 32, 15)' },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  infoText: { flex: 1, fontSize: 13, fontFamily: 'Montserrat_400Regular', color: 'rgb(55, 65, 81)' },
  coords: { fontSize: 11, color: 'rgb(156, 163, 175)', marginTop: 4, marginBottom: 12 },
  notesBox: { backgroundColor: 'rgb(249, 250, 251)', borderRadius: 12, padding: 12, marginTop: 4 },
  notesTitle: { fontSize: 12, fontFamily: 'Montserrat_700Bold', color: 'rgb(16, 32, 15)', marginBottom: 6 },
  notesBody: { fontSize: 13, fontFamily: 'Montserrat_400Regular', color: 'rgb(75, 85, 99)', lineHeight: 20 },
  attachmentsScroll: { marginTop: 10 },
  attachmentImage: { width: 72, height: 72, borderRadius: 10, marginRight: 8 },
  rejectionBanner: {
    marginTop: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'rgb(255, 231, 231)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgb(255, 201, 201)',
    padding: 14,
  },
  rejectionBannerTitle: {
    fontSize: 14,
    fontFamily: 'Montserrat_700Bold',
    color: 'rgb(180, 35, 24)',
  },
  rejectionBannerBody: {
    fontSize: 12,
    fontFamily: 'Montserrat_400Regular',
    color: 'rgb(127, 29, 29)',
    marginTop: 2,
    lineHeight: 18,
  },
  buttonDock: {
    paddingTop: 16,
    paddingHorizontal: 16,
    backgroundColor: 'rgb(251, 252, 247)',
    borderTopWidth: 1,
    borderTopColor: 'rgb(229, 231, 235)',
  },
  trackButton: {
    backgroundColor: 'rgb(109, 170, 26)',
    padding: 15,
    borderRadius: 15,
    alignItems: 'center',
  },
  trackButtonText: {
    color: 'rgb(255, 255, 255)',
    fontSize: 16,
    fontFamily: 'Montserrat_700Bold',
  },
  pendingBanner: {
    marginHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgb(255, 242, 217)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgb(245, 217, 168)',
    padding: 14,
  },
  pendingBannerText: {
    flex: 1,
    fontSize: 12,
    fontFamily: 'Montserrat_600SemiBold',
    color: 'rgb(138, 90, 0)',
  },
})
