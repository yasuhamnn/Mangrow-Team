import React, { useEffect, useState } from 'react'
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Image,
  Alert,
  ActivityIndicator,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useLocalSearchParams, useRouter } from 'expo-router'
import LoadingOverlay from '../components/LoadingOverlay'
import ImageViewerModal from '../components/ImageViewerModal'
import AdaptiveLocationText from '../components/AdaptiveLocationText'
import {
  getResolutionCompareData,
  markResolutionResolved,
} from '../utils/admin/adminResolutionReviewBackend'

function ImageStrip({ title, images, onPressImage }) {
  if (!images?.length) {
    return (
      <View style={styles.stripCard}>
        <Text style={styles.stripTitle}>{title}</Text>
        <Text style={styles.emptyStrip}>No images available</Text>
      </View>
    )
  }

  return (
    <View style={styles.stripCard}>
      <Text style={styles.stripTitle}>{title}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        {images.map((uri, index) => (
          <TouchableOpacity key={`${uri}-${index}`} onPress={() => onPressImage(images, index)}>
            <Image source={{ uri }} style={styles.compareImage} />
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  )
}

export default function AdminResolutionCompare() {
  const router = useRouter()
  const { resolutionId } = useLocalSearchParams()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [viewerOpen, setViewerOpen] = useState(false)
  const [viewerImages, setViewerImages] = useState([])
  const [viewerIndex, setViewerIndex] = useState(0)

  useEffect(() => {
    let mounted = true
    const load = async () => {
      try {
        setLoading(true)
        const result = await getResolutionCompareData(resolutionId)
        if (mounted) setData(result)
      } catch (e) {
        Alert.alert('Error', e?.message || 'Failed to load comparison.')
        if (mounted) router.back()
      } finally {
        if (mounted) setLoading(false)
      }
    }
    if (resolutionId) load()
    return () => { mounted = false }
  }, [resolutionId, router])

  const openViewer = (images, index) => {
    setViewerImages(images)
    setViewerIndex(index)
    setViewerOpen(true)
  }

  const onResolve = async () => {
    setSubmitting(true)
    try {
      await markResolutionResolved(resolutionId)
      Alert.alert('Resolved', 'The report is now marked as resolved.', [
        { text: 'OK', onPress: () => router.replace('/admin/admin_verify') },
      ])
    } catch (e) {
      Alert.alert('Error', e?.message || 'Failed to mark as resolved.')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
        <ActivityIndicator size="large" color="rgb(109, 170, 26)" style={{ marginTop: 40 }} />
      </SafeAreaView>
    )
  }

  if (!data) return null

  const reportImages = [
    data.report?.image_url,
    ...(data.report?.attachments?.map((a) => a.image_url) || []),
  ].filter(Boolean)

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={18} color="rgb(16, 32, 15)" />
          </TouchableOpacity>
          <Text style={styles.title}>Compare Resolution</Text>
          <View style={{ width: 38 }} />
        </View>

        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>{data.report?.species || 'Mangrove report'}</Text>
          <AdaptiveLocationText text={data.report?.formatted_address} color="rgb(107, 114, 128)" />
          <Text style={styles.volunteerText}>Volunteer: {data.volunteer_name}</Text>
        </View>

        <ImageStrip title="Original report photos" images={reportImages} onPressImage={openViewer} />
        <ImageStrip title="Submitted resolution proof" images={data.resolution_images} onPressImage={openViewer} />

        <View style={styles.notesCard}>
          <Text style={styles.notesTitle}>Resolution notes</Text>
          <Text style={styles.notesBody}>{data.notes || 'No notes provided.'}</Text>
        </View>

        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.rejectBtn}
            onPress={() => router.push({
              pathname: '/admin/admin_reject_resolution',
              params: { resolutionId },
            })}
            activeOpacity={0.85}
          >
            <Text style={styles.rejectText}>Reject</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.resolveBtn, submitting && styles.resolveBtnDisabled]}
            onPress={onResolve}
            disabled={submitting}
            activeOpacity={0.85}
          >
            <Text style={styles.resolveText}>Mark Resolved</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <ImageViewerModal
        visible={viewerOpen}
        images={viewerImages}
        index={viewerIndex}
        onClose={() => setViewerOpen(false)}
        onIndexChange={setViewerIndex}
      />
      <LoadingOverlay visible={submitting} />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'rgb(251, 252, 247)' },
  content: { padding: 16, paddingBottom: 40 },
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
  summaryCard: {
    backgroundColor: 'rgb(255, 255, 255)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgb(232, 236, 221)',
    padding: 14,
    marginBottom: 12,
  },
  summaryTitle: { fontSize: 16, fontFamily: 'Montserrat_700Bold', color: 'rgb(16, 32, 15)' },
  volunteerText: { fontSize: 12, fontFamily: 'Montserrat_600SemiBold', color: 'rgb(55, 65, 81)', marginTop: 8 },
  stripCard: {
    backgroundColor: 'rgb(255, 255, 255)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgb(232, 236, 221)',
    padding: 14,
    marginBottom: 12,
  },
  stripTitle: { fontSize: 13, fontFamily: 'Montserrat_700Bold', color: 'rgb(16, 32, 15)', marginBottom: 10 },
  emptyStrip: { fontSize: 12, color: 'rgb(156, 163, 175)', fontFamily: 'Montserrat_400Regular' },
  compareImage: { width: 120, height: 120, borderRadius: 12, marginRight: 10 },
  notesCard: {
    backgroundColor: 'rgb(255, 242, 217)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgb(245, 217, 168)',
    padding: 14,
    marginBottom: 20,
  },
  notesTitle: { fontSize: 13, fontFamily: 'Montserrat_700Bold', color: 'rgb(16, 32, 15)', marginBottom: 6 },
  notesBody: { fontSize: 13, lineHeight: 20, fontFamily: 'Montserrat_400Regular', color: 'rgb(75, 85, 99)' },
  actions: { flexDirection: 'row', gap: 10 },
  rejectBtn: {
    flex: 1,
    backgroundColor: 'rgb(247, 230, 230)',
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
  },
  rejectText: { color: 'rgb(255, 77, 79)', fontFamily: 'Montserrat_700Bold', fontSize: 14 },
  resolveBtn: {
    flex: 1,
    backgroundColor: 'rgb(109, 170, 26)',
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
  },
  resolveBtnDisabled: { opacity: 0.7 },
  resolveText: { color: 'rgb(255, 255, 255)', fontFamily: 'Montserrat_700Bold', fontSize: 14 },
})
