import { Ionicons } from '@expo/vector-icons'
import { useLocalSearchParams, useRouter } from 'expo-router'
import React, { useEffect, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import LoadingOverlay from '../components/LoadingOverlay'
import {
  getResolutionForRejection,
  rejectResolutionWithReason,
  RESOLUTION_REJECTION_PRESETS,
} from '../utils/admin/adminResolutionRejectionBackend'

export default function AdminRejectResolution() {
  const router = useRouter()
  const { resolutionId } = useLocalSearchParams()
  const [resolution, setResolution] = useState(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [category, setCategory] = useState(null)
  const [customNote, setCustomNote] = useState('')

  useEffect(() => {
    let mounted = true

    const load = async () => {
      try {
        setLoading(true)
        const data = await getResolutionForRejection(resolutionId)
        if (mounted) setResolution(data)
      } catch (e) {
        Alert.alert('Error', e?.message || 'Failed to load resolution.')
        if (mounted) router.back()
      } finally {
        if (mounted) setLoading(false)
      }
    }

    if (resolutionId) load()
    return () => { mounted = false }
  }, [resolutionId, router])

  const onSubmit = async () => {
    if (!category) {
      Alert.alert('Required', 'Please select a rejection reason.')
      return
    }
    if (category === 'other' && !customNote.trim()) {
      Alert.alert('Required', 'Please explain why this resolution was rejected.')
      return
    }

    setSubmitting(true)
    try {
      await rejectResolutionWithReason({
        resolutionId,
        category,
        customNote,
      })
      Alert.alert('Rejected', 'The volunteer will see your feedback on this resolution.', [
        { text: 'OK', onPress: () => router.replace('/admin/admin_verify') },
      ])
    } catch (e) {
      Alert.alert('Error', e?.message || 'Failed to reject resolution.')
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

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={18} color="rgb(16, 32, 15)" />
        </TouchableOpacity>
        <Text style={styles.title}>Reject Resolution</Text>
        <View style={{ width: 38 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>Resolution submission</Text>
          <Text style={styles.summaryBody}>
            {resolution?.notes || 'No resolution notes provided.'}
          </Text>
        </View>

        <Text style={styles.sectionTitle}>Why is this resolution being rejected?</Text>
        <Text style={styles.sectionHint}>
          The volunteer will receive this private feedback in the app.
        </Text>

        <View style={styles.presetList}>
          {RESOLUTION_REJECTION_PRESETS.map((preset) => {
            const active = category === preset.id
            return (
              <TouchableOpacity
                key={preset.id}
                style={[styles.presetChip, active && styles.presetChipActive]}
                onPress={() => setCategory(preset.id)}
                activeOpacity={0.85}
              >
                <Text style={[styles.presetText, active && styles.presetTextActive]}>
                  {preset.label}
                </Text>
              </TouchableOpacity>
            )
          })}
        </View>

        <Text style={styles.inputLabel}>
          {category === 'other' ? 'Explanation (required)' : 'Additional notes (optional)'}
        </Text>
        <TextInput
          style={styles.textArea}
          multiline
          placeholder="Explain what clearer resolution evidence is needed..."
          placeholderTextColor="rgb(156, 163, 175)"
          value={customNote}
          onChangeText={setCustomNote}
          maxLength={500}
        />
        <Text style={styles.charCount}>{customNote.length}/500</Text>

        <TouchableOpacity
          style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
          onPress={onSubmit}
          disabled={submitting}
          activeOpacity={0.85}
        >
          <Text style={styles.submitButtonText}>Send rejection to volunteer</Text>
        </TouchableOpacity>
      </ScrollView>

      <LoadingOverlay visible={submitting} />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'rgb(251, 252, 247)' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
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
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  summaryCard: {
    backgroundColor: 'rgb(255, 242, 217)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgb(245, 217, 168)',
    padding: 14,
    marginBottom: 20,
  },
  summaryTitle: {
    fontSize: 14,
    fontFamily: 'Montserrat_700Bold',
    color: 'rgb(16, 32, 15)',
    marginBottom: 6,
  },
  summaryBody: {
    fontSize: 13,
    fontFamily: 'Montserrat_400Regular',
    color: 'rgb(75, 85, 99)',
    lineHeight: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: 'Montserrat_700Bold',
    color: 'rgb(16, 32, 15)',
    marginBottom: 6,
  },
  sectionHint: {
    fontSize: 13,
    fontFamily: 'Montserrat_400Regular',
    color: 'rgb(107, 114, 128)',
    marginBottom: 14,
    lineHeight: 18,
  },
  presetList: { gap: 8, marginBottom: 18 },
  presetChip: {
    backgroundColor: 'rgb(255, 255, 255)',
    borderWidth: 1,
    borderColor: 'rgb(232, 236, 221)',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  presetChipActive: {
    backgroundColor: 'rgb(255, 231, 231)',
    borderColor: 'rgb(255, 77, 79)',
  },
  presetText: {
    fontSize: 13,
    fontFamily: 'Montserrat_600SemiBold',
    color: 'rgb(55, 65, 81)',
  },
  presetTextActive: { color: 'rgb(180, 35, 24)' },
  inputLabel: {
    fontSize: 13,
    fontFamily: 'Montserrat_600SemiBold',
    color: 'rgb(16, 32, 15)',
    marginBottom: 8,
  },
  textArea: {
    minHeight: 110,
    backgroundColor: 'rgb(255, 255, 255)',
    borderWidth: 1,
    borderColor: 'rgb(232, 236, 221)',
    borderRadius: 14,
    padding: 14,
    fontSize: 14,
    fontFamily: 'Montserrat_400Regular',
    color: 'rgb(16, 32, 15)',
    textAlignVertical: 'top',
  },
  charCount: {
    fontSize: 11,
    color: 'rgb(156, 163, 175)',
    textAlign: 'right',
    marginTop: 6,
    marginBottom: 20,
  },
  submitButton: {
    backgroundColor: 'rgb(255, 77, 79)',
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
  },
  submitButtonDisabled: { opacity: 0.7 },
  submitButtonText: {
    color: 'rgb(255, 255, 255)',
    fontFamily: 'Montserrat_700Bold',
    fontSize: 14,
  },
})
