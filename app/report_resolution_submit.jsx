import React, { useEffect, useState } from 'react'
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Image,
  Alert,
  ActivityIndicator,
} from 'react-native'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import * as ImagePicker from 'expo-image-picker'
import { useLocalSearchParams, useRouter } from 'expo-router'
import LoadingOverlay from './components/LoadingOverlay'
import { submitResolutionProof } from './utils/volunteerResolutionSubmitBackend'

export default function ReportResolutionSubmit() {
  const router = useRouter()
  const { reportId, latitude, longitude } = useLocalSearchParams()
  const insets = useSafeAreaInsets()
  const bottomSafePadding = Math.max(insets.bottom, 16)
  const [notes, setNotes] = useState('')
  const [photos, setPhotos] = useState([])
  const [submitting, setSubmitting] = useState(false)

  const pickPhotos = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Photo library access is required.')
      return
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.8,
      selectionLimit: 4,
    })

    if (!result.canceled) {
      setPhotos((prev) => [...prev, ...result.assets.map((a) => a.uri)].slice(0, 4))
    }
  }

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync()
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Camera access is required.')
      return
    }

    const result = await ImagePicker.launchCameraAsync({ quality: 0.8 })
    if (!result.canceled) {
      setPhotos((prev) => [...prev, result.assets[0].uri].slice(0, 4))
    }
  }

  const onSubmit = async () => {
    setSubmitting(true)
    try {
      await submitResolutionProof({
        reportId,
        notes,
        imageUris: photos,
        latitude: latitude ? Number(latitude) : null,
        longitude: longitude ? Number(longitude) : null,
      })
      Alert.alert('Submitted', 'Admins will review your resolution proof.', [
        { text: 'OK', onPress: () => router.replace({ pathname: '/report_details', params: { id: reportId } }) },
      ])
    } catch (e) {
      Alert.alert('Error', e?.message || 'Failed to submit resolution.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: bottomSafePadding + 24 }]} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={18} color="rgb(16, 32, 15)" />
          </TouchableOpacity>
          <Text style={styles.title}>Submit Resolution</Text>
          <View style={{ width: 38 }} />
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Resolution photos</Text>
          <Text style={styles.sectionHint}>Upload clear proof that the reported area has been addressed.</Text>

          <View style={styles.photoActions}>
            <TouchableOpacity style={styles.photoBtn} onPress={takePhoto} activeOpacity={0.85}>
              <Ionicons name="camera" size={18} color="rgb(16, 32, 15)" />
              <Text style={styles.photoBtnText}>Take photo</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.photoBtn} onPress={pickPhotos} activeOpacity={0.85}>
              <Ionicons name="images" size={18} color="rgb(16, 32, 15)" />
              <Text style={styles.photoBtnText}>From gallery</Text>
            </TouchableOpacity>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.photoRow}>
            {photos.map((uri, index) => (
              <View key={`${uri}-${index}`} style={styles.photoWrap}>
                <Image source={{ uri }} style={styles.photo} />
                <TouchableOpacity
                  style={styles.removePhoto}
                  onPress={() => setPhotos((prev) => prev.filter((_, i) => i !== index))}
                >
                  <Ionicons name="close" size={14} color="rgb(255, 255, 255)" />
                </TouchableOpacity>
              </View>
            ))}
          </ScrollView>

          <Text style={styles.sectionTitle}>Your notes</Text>
          <TextInput
            style={styles.textArea}
            multiline
            placeholder="Describe what was done, observations, or any details for the admin..."
            placeholderTextColor="rgb(156, 163, 175)"
            value={notes}
            onChangeText={setNotes}
            maxLength={600}
          />
          <Text style={styles.charCount}>{notes.length}/600</Text>
        </View>

        <TouchableOpacity
          style={[styles.submitBtn, submitting && styles.submitBtnDisabled]}
          onPress={onSubmit}
          disabled={submitting}
          activeOpacity={0.85}
        >
          <Text style={styles.submitBtnText}>Submit to admin for review</Text>
        </TouchableOpacity>
      </ScrollView>

      <LoadingOverlay visible={submitting} />
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
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgb(232, 236, 221)',
    padding: 16,
    marginBottom: 16,
  },
  sectionTitle: { fontSize: 14, fontFamily: 'Montserrat_700Bold', color: 'rgb(16, 32, 15)', marginBottom: 6 },
  sectionHint: { fontSize: 12, fontFamily: 'Montserrat_400Regular', color: 'rgb(107, 114, 128)', marginBottom: 12 },
  photoActions: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  photoBtn: {
    flex: 1,
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgb(239, 245, 232)',
    borderRadius: 12,
    paddingVertical: 12,
  },
  photoBtnText: { fontSize: 12, fontFamily: 'Montserrat_600SemiBold', color: 'rgb(16, 32, 15)' },
  photoRow: { marginBottom: 16 },
  photoWrap: { marginRight: 10, position: 'relative' },
  photo: { width: 88, height: 88, borderRadius: 12 },
  removePhoto: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  textArea: {
    minHeight: 120,
    borderWidth: 1,
    borderColor: 'rgb(232, 236, 221)',
    borderRadius: 14,
    padding: 12,
    fontSize: 14,
    fontFamily: 'Montserrat_400Regular',
    color: 'rgb(16, 32, 15)',
    textAlignVertical: 'top',
  },
  charCount: { fontSize: 11, color: 'rgb(156, 163, 175)', textAlign: 'right', marginTop: 6 },
  submitBtn: {
    backgroundColor: 'rgb(109, 170, 26)',
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
  },
  submitBtnDisabled: { opacity: 0.7 },
  submitBtnText: { color: 'rgb(255, 255, 255)', fontFamily: 'Montserrat_700Bold', fontSize: 14 },
})
