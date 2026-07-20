import React, { useCallback, useEffect, useState } from 'react'
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Image,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useLocalSearchParams, useRouter } from 'expo-router'
import BottomNav from './components/BottomNav'
import { getResolutionRejectionFeedback } from './utils/volunteerResolutionRejectionBackend'
import { useBottomNavMetrics } from './utils/shared/screenLayout'
import { usePullToRefresh } from './utils/shared/usePullToRefresh'
import ScreenHeader, { HeaderBackButton, HeaderSideSpacer, screenLayoutStyles } from './components/ScreenHeader'

export default function ResolutionRejectionFeedback() {
  const router = useRouter()
  const { reportId } = useLocalSearchParams()
  const { scrollPadding } = useBottomNavMetrics()
  const [feedback, setFeedback] = useState(null)
  const [loading, setLoading] = useState(true)

  const loadFeedback = useCallback(async ({ silent = false } = {}) => {
    if (!reportId) return
    try {
      if (!silent) setLoading(true)
      const data = await getResolutionRejectionFeedback(reportId)
      setFeedback(data)
    } catch (e) {
      if (!silent) {
        Alert.alert('Error', e?.message || 'Failed to load resolution rejection feedback.')
        router.back()
      }
    } finally {
      if (!silent) setLoading(false)
    }
  }, [reportId, router])

  const { refreshControl } = usePullToRefresh(() => loadFeedback({ silent: true }))

  useEffect(() => {
    loadFeedback()
  }, [loadFeedback])

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
        <ActivityIndicator size="large" color="rgb(109, 170, 26)" style={{ marginTop: 40 }} />
      </SafeAreaView>
    )
  }

  if (!feedback) return null

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <ScreenHeader
        title="Resolution Feedback"
        centered
        leading={<HeaderBackButton onPress={() => router.back()} />}
        right={<HeaderSideSpacer />}
      />

      <ScrollView
        style={screenLayoutStyles.scrollView}
        contentContainerStyle={[screenLayoutStyles.scrollContent, { paddingBottom: scrollPadding }]}
        refreshControl={refreshControl}
      >
        <View style={styles.alertCard}>
          <Ionicons name="close-circle" size={28} color="rgb(255, 77, 79)" />
          <View style={{ flex: 1 }}>
            <Text style={styles.alertTitle}>Your resolution was not accepted</Text>
            <Text style={styles.alertSubtitle}>
              An admin reviewed your resolution submission and left private feedback below.
            </Text>
          </View>
        </View>

        {feedback.image_url ? (
          <View style={styles.card}>
            <Image source={{ uri: feedback.image_url }} style={styles.image} />
          </View>
        ) : null}

        {feedback.notes ? (
          <View style={styles.card}>
            <Text style={styles.cardLabel}>Your submission</Text>
            <Text style={styles.cardBody}>{feedback.notes}</Text>
          </View>
        ) : null}

        <View style={styles.reasonCard}>
          <Text style={styles.reasonTitle}>Admin feedback</Text>
          <Text style={styles.reasonBody}>
            {feedback.rejection_reason || 'No detailed reason was provided.'}
          </Text>
          {feedback.rejected_at ? (
            <Text style={styles.reviewedAt}>
              Reviewed on {new Date(feedback.rejected_at).toLocaleString()}
            </Text>
          ) : null}
        </View>

        <View style={styles.tipCard}>
          <Text style={styles.tipTitle}>What you can do next</Text>
          <Text style={styles.tipBody}>
            Submit clearer resolution evidence from the original report screen when you are ready.
          </Text>
        </View>

        <TouchableOpacity
          style={styles.primaryButton}
          onPress={() => router.push({ pathname: '/report_details', params: { id: reportId } })}
          activeOpacity={0.85}
        >
          <Text style={styles.primaryButtonText}>Back to report</Text>
        </TouchableOpacity>
      </ScrollView>

      <BottomNav activeTab="home" />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'rgb(251, 252, 247)' },
  alertCard: {
    flexDirection: 'row',
    gap: 12,
    backgroundColor: 'rgb(255, 231, 231)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgb(255, 201, 201)',
    padding: 14,
    marginBottom: 16,
    alignItems: 'flex-start',
  },
  alertTitle: {
    fontSize: 15,
    fontFamily: 'Montserrat_700Bold',
    color: 'rgb(180, 35, 24)',
  },
  alertSubtitle: {
    fontSize: 12,
    fontFamily: 'Montserrat_400Regular',
    color: 'rgb(127, 29, 29)',
    marginTop: 4,
    lineHeight: 18,
  },
  card: {
    backgroundColor: 'rgb(255, 255, 255)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgb(232, 236, 221)',
    padding: 14,
    marginBottom: 14,
  },
  image: {
    width: '100%',
    height: 180,
    borderRadius: 12,
  },
  cardLabel: {
    fontSize: 13,
    fontFamily: 'Montserrat_700Bold',
    color: 'rgb(16, 32, 15)',
    marginBottom: 6,
  },
  cardBody: {
    fontSize: 13,
    lineHeight: 20,
    fontFamily: 'Montserrat_400Regular',
    color: 'rgb(75, 85, 99)',
  },
  reasonCard: {
    backgroundColor: 'rgb(255, 255, 255)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgb(255, 201, 201)',
    padding: 16,
    marginBottom: 14,
  },
  reasonTitle: {
    fontSize: 14,
    fontFamily: 'Montserrat_700Bold',
    color: 'rgb(16, 32, 15)',
    marginBottom: 8,
  },
  reasonBody: {
    fontSize: 14,
    lineHeight: 22,
    fontFamily: 'Montserrat_400Regular',
    color: 'rgb(55, 65, 81)',
  },
  reviewedAt: {
    fontSize: 12,
    fontFamily: 'Montserrat_400Regular',
    color: 'rgb(107, 114, 128)',
    marginTop: 10,
  },
  tipCard: {
    backgroundColor: 'rgb(255, 242, 217)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgb(245, 217, 168)',
    padding: 16,
    marginBottom: 20,
  },
  tipTitle: {
    fontSize: 14,
    fontFamily: 'Montserrat_700Bold',
    color: 'rgb(16, 32, 15)',
    marginBottom: 6,
  },
  tipBody: {
    fontSize: 13,
    lineHeight: 20,
    fontFamily: 'Montserrat_400Regular',
    color: 'rgb(75, 85, 99)',
  },
  primaryButton: {
    backgroundColor: 'rgb(109, 170, 26)',
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: 'rgb(255, 255, 255)',
    fontFamily: 'Montserrat_700Bold',
    fontSize: 14,
  },
})
