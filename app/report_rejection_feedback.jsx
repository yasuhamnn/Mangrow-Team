import React, { useEffect, useState } from 'react'
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
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { getReportRejectionFeedback } from './utils/volunteerReportRejectionBackend'

export default function ReportRejectionFeedback() {
  const router = useRouter()
  const { id } = useLocalSearchParams()
  const insets = useSafeAreaInsets()
  const bottomSafePadding = Math.max(insets.bottom, 16)
  const scrollBottomPadding = bottomSafePadding + 72
  const [feedback, setFeedback] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true

    const load = async () => {
      try {
        setLoading(true)
        const data = await getReportRejectionFeedback(id)
        if (mounted) setFeedback(data)
      } catch (e) {
        Alert.alert('Error', e?.message || 'Failed to load rejection feedback.')
        if (mounted) router.back()
      } finally {
        if (mounted) setLoading(false)
      }
    }

    if (id) load()
    return () => { mounted = false }
  }, [id, router])

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
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: scrollBottomPadding }]}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={18} color="rgb(16, 32, 15)" />
          </TouchableOpacity>
          <Text style={styles.title}>Rejection Feedback</Text>
          <View style={{ width: 38 }} />
        </View>

        <View style={styles.alertCard}>
          <Ionicons name="close-circle" size={28} color="rgb(255, 77, 79)" />
          <View style={{ flex: 1 }}>
            <Text style={styles.alertTitle}>Your report was not approved</Text>
            <Text style={styles.alertSubtitle}>
              An admin reviewed your submission and left private feedback below.
            </Text>
          </View>
        </View>

        <View style={styles.card}>
          <Image
            source={feedback.image_url ? { uri: feedback.image_url } : require('../assets/mangroves_carousel_1.webp')}
            style={styles.image}
          />
          <Text style={styles.species}>{feedback.species}</Text>
          <Text style={styles.meta}>{feedback.formatted_address || 'Unknown location'}</Text>
          {feedback.rejected_at ? (
            <Text style={styles.meta}>
              Reviewed on {new Date(feedback.rejected_at).toLocaleString()}
            </Text>
          ) : null}
        </View>

        <View style={styles.reasonCard}>
          <Text style={styles.reasonTitle}>Admin feedback</Text>
          <Text style={styles.reasonBody}>
            {feedback.rejection_reason || 'No detailed reason was provided.'}
          </Text>
        </View>

        <View style={styles.tipCard}>
          <Text style={styles.tipTitle}>What you can do next</Text>
          <Text style={styles.tipBody}>
            Review the feedback, capture a clearer photo if needed, and submit a new report from the scan screen.
          </Text>
        </View>

        <TouchableOpacity
          onPress={() => router.push({ pathname: '/report_details', params: { id } })}
          activeOpacity={0.7}
          style={styles.textLinkWrap}
        >
          <Text style={styles.textLink}>View original report</Text>
        </TouchableOpacity>
      </ScrollView>

      <View style={[styles.actionDock, { paddingBottom: bottomSafePadding }]}>
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={() => router.push('/camera')}
          activeOpacity={0.85}
        >
          <Text style={styles.primaryButtonText}>Submit a new report →</Text>
        </TouchableOpacity>
      </View>
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
  title: {
    fontSize: 20,
    fontFamily: 'Montserrat_700Bold',
    color: 'rgb(16, 32, 15)',
  },
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
    marginBottom: 12,
  },
  species: {
    fontSize: 17,
    fontFamily: 'Montserrat_700Bold',
    color: 'rgb(16, 32, 15)',
  },
  meta: {
    fontSize: 12,
    fontFamily: 'Montserrat_400Regular',
    color: 'rgb(107, 114, 128)',
    marginTop: 4,
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
  tipCard: {
    backgroundColor: 'rgb(247, 252, 242)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgb(221, 243, 214)',
    padding: 16,
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
  actionDock: {
    paddingTop: 16,
    paddingHorizontal: 16,
    backgroundColor: 'rgb(251, 252, 247)',
    borderTopWidth: 1,
    borderTopColor: 'rgb(229, 231, 235)',
  },
  primaryButton: {
    backgroundColor: 'rgb(109, 170, 26)',
    padding: 15,
    borderRadius: 15,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: 'rgb(255, 255, 255)',
    fontSize: 16,
    fontFamily: 'Montserrat_700Bold',
  },
  textLinkWrap: {
    alignItems: 'center',
    paddingVertical: 8,
    marginTop: 16,
  },
  textLink: {
    color: 'rgb(67, 113, 5)',
    fontSize: 14,
    fontFamily: 'Montserrat_700Bold',
  },
})
