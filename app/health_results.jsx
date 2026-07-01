import React, { useState } from 'react'
import { StyleSheet, Text, View, TextInput, TouchableOpacity, ScrollView, SafeAreaView, Image, Alert, ActivityIndicator } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import * as ImagePicker from 'expo-image-picker'
import { supabase } from '../supabaseClient'
import { submitReport, uploadReportImage } from './utils/submitReport'
import { formatLocationAddress } from './utils/shared/locationFormat'
import {
  useFonts,
  Montserrat_400Regular,
  Montserrat_600SemiBold,
  Montserrat_700Bold,
} from '@expo-google-fonts/montserrat'

export default function HealthResult() {
  const router = useRouter()
  const params = useLocalSearchParams()

  const [fieldNotes, setFieldNotes] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [additionalImages, setAdditionalImages] = useState([])
  const insets = useSafeAreaInsets()

  const [fontsLoaded] = useFonts({
    Montserrat_400Regular,
    Montserrat_600SemiBold,
    Montserrat_700Bold,
  })
  if (!fontsLoaded) return null

  // Placeholder state for AI health result
  const readableLocation = formatLocationAddress({
    purok: params.purok,
    street: params.street,
    barangay: params.barangay,
    city: params.city || params.subregion,
    formattedAddress: params.formattedAddress,
  })
  const healthStatus = (params.healthStatus || 'unhealthy').toLowerCase()
  const isHealthy = healthStatus === 'healthy'
  const healthResult = isHealthy ? 'Healthy' : 'Unhealthy'
  const healthDescription = isHealthy
    ? 'The mangrove appears to be in good condition based on leaf analysis.'
    : 'The mangrove shows signs of stress or damage that may require attention.'

  const formattedDate = params.timestamp
    ? new Date(params.timestamp).toLocaleString()
    : 'Unknown Date'

  const pickAdditionalImages = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: true,
        quality: 0.6,
      })

      if (!result.canceled) {
        const newUris = result.assets.map(asset => asset.uri)
        setAdditionalImages(prev => [...prev, ...newUris])
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to pick images.')
    }
  }

  const removeAdditionalImage = (index) => {
    setAdditionalImages(prev => prev.filter((_, i) => i !== index))
  }

  const handleSubmit = async () => {
    if (isSubmitting) return

    if (!params.latitude || !params.longitude) {
      Alert.alert('Missing Location', 'Latitude and longitude are required to submit a report.')
      return
    }

    setIsSubmitting(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        throw new Error('User session not found. Please sign in again.')
      }

      const uploadedUrls = []
      for (const uri of additionalImages) {
        const url = await uploadReportImage(uri)
        uploadedUrls.push(url)
      }

      await submitReport({
        imageUri: params.imageUri || null,
        latitude: params.latitude,
        longitude: params.longitude,
        species: params.speciesName || null,
        healthStatus,
        reportStatus: isHealthy ? 'recorded' : 'pending',
        notes: fieldNotes.trim() || null,
        purok: params.purok || null,
        street: params.street || null,
        barangay: params.barangay || null,
        city: params.city || null,
        subregion: params.subregion || null,
        formattedAddress: params.formattedAddress || null,
        additionalImageUrls: uploadedUrls,
      })

      if (isHealthy) {
        Alert.alert(
          'Status Recorded',
          'Your healthy mangrove observation has been saved and will appear on the map as a green marker.',
          [{ text: 'OK', onPress: () => router.replace('/dashboard') }]
        )
      } else {
        Alert.alert(
          'Report Submitted',
          'Your report has been sent to the admin for verification. You will be notified once it is approved.',
          [{ text: 'OK', onPress: () => router.replace('/dashboard') }]
        )
      }
    } catch (error) {
      Alert.alert('Submission Failed', error.message || 'An unexpected error occurred. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>

        {/* Captured Image Preview */}
        <View style={styles.imageCard}>
          {params.imageUri ? (
            <Image source={{ uri: params.imageUri }} style={styles.image} />
          ) : (
            <View style={styles.imagePlaceholder}>
              <Ionicons name="image-outline" size={50} color="rgb(156, 163, 175)" />
            </View>
          )}
        </View>

        {/* Health Status Card */}
        <View style={styles.card}>
          <View style={styles.statusRow}>
            <View style={styles.iconCircle}>
              <Ionicons name="heart-circle-outline" size={26} color="rgb(109, 170, 26)" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.healthTitle}>{healthResult || 'Health Status'}</Text>
              <Text style={styles.healthDescription}>
                {healthDescription || 'Classification will appear here once AI model is implemented.'}
              </Text>
              <Text style={styles.healthDisclaimer}>
                Classification generated by trained AI model. Intended for preliminary environmental assessment only.
              </Text>
            </View>
          </View>
        </View>

        {/* Field Notes */}
        <View style={styles.card}>
          <Text style={styles.label}>Field Notes (Optional)</Text>
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.textArea}
              multiline
              placeholder="Describe any additional observations: debris, oil spills, unusual conditions, wildlife presence, weather conditions..."
              placeholderTextColor="rgb(156, 163, 175)"
              value={fieldNotes}
              onChangeText={setFieldNotes}
              maxLength={500}
            />
            <View style={styles.footerInsideInput}>
              {additionalImages.length > 0 && (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.imagePreviewScroll}>
                  {additionalImages.map((uri, index) => (
                    <View key={index} style={styles.previewThumbnailWrapper}>
                      <Image source={{ uri }} style={styles.previewThumbnail} />
                      <TouchableOpacity 
                        style={styles.removeThumbnailBtn} 
                        onPress={() => removeAdditionalImage(index)}
                      >
                        <Ionicons name="close-circle" size={16} color="rgb(255, 77, 79)" />
                      </TouchableOpacity>
                    </View>
                  ))}
                </ScrollView>
              )}
              <TouchableOpacity onPress={pickAdditionalImages} style={styles.inputAttachBtn}>
                <Ionicons name="attach-outline" size={16} color="rgb(52, 162, 50)" />
              </TouchableOpacity>
            </View>
          </View>

          <Text style={styles.charCount}>{fieldNotes.length}/500 characters</Text>
        </View>

        {/* Report Summary */}
        <View style={styles.card}>
          <Text style={styles.label}>Report Summary</Text>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Species:</Text>
            <Text style={styles.summaryValue}>{params.speciesName || 'N/A'}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Condition:</Text>
            <Text style={[styles.summaryValue, { color: isHealthy ? 'rgb(45, 160, 49)' : 'rgb(255, 77, 79)' }]}>{healthResult}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Current Location:</Text>
            <Text style={styles.summaryValue}>{readableLocation || params.formattedAddress || 'N/A'}</Text>
          </View>

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Latitude:</Text>
            <Text style={styles.summaryValue}>{params.latitude || 'N/A'}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Longitude:</Text>
            <Text style={styles.summaryValue}>{params.longitude || 'N/A'}</Text>
          </View>
          
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Date:</Text>
            <Text style={styles.summaryValue}>{formattedDate}</Text>
          </View>
        </View>

      </ScrollView>

      {/* Floating Header Overlay */}
      <SafeAreaView style={styles.headerOverlay} pointerEvents="box-none">
        <View style={styles.topOverlay}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={18} color="rgb(48, 64, 24)" />
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      {/* Fixed Action Button Dock */}
      <View style={[styles.buttonDock, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        <TouchableOpacity
          style={[
            styles.primaryButton,
            isHealthy ? styles.recordButton : styles.submitButton,
            isSubmitting && styles.primaryButtonDisabled,
          ]}
          onPress={handleSubmit}
          disabled={isSubmitting}
          activeOpacity={0.8}
        >
          {isSubmitting ? (
            <ActivityIndicator size="small" color="rgb(255, 255, 255)" />
          ) : (
            <Ionicons
              name={isHealthy ? 'leaf-outline' : 'checkmark-circle-outline'}
              size={22}
              color="rgb(255, 255, 255)"
            />
          )}
          <Text style={styles.primaryButtonText}>
            {isSubmitting
              ? (isHealthy ? 'Recording...' : 'Submitting...')
              : (isHealthy ? 'Record Status' : 'Submit Report')}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'rgb(251, 252, 247)',
  },
  content: {
    padding: 16,
    paddingBottom: 30,
    paddingTop: 80,
  },
  headerOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  topOverlay: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 22,
    paddingTop: 35,
    backgroundColor: 'transparent',
  },
  backButton: {
    width: 30,
    height: 30,
    borderRadius: 10,
    backgroundColor: 'rgba(239, 245, 232, 1)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.16)',
  },
  card: {
    backgroundColor: 'rgb(255, 255, 255)',
    borderRadius: 20,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgb(232, 236, 221)',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  iconCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgb(221, 243, 214)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  healthTitle: {
    fontFamily: 'Montserrat_700Bold',
    fontSize: 16,
    color: 'rgb(16, 32, 15)',
    marginBottom: 4,
  },
  healthDescription: {
    fontFamily: 'Montserrat_400Regular',
    fontSize: 13,
    color: 'rgb(75, 85, 99)',
    marginBottom: 6,
  },
  healthDisclaimer: {
    fontFamily: 'Montserrat_400Regular',
    fontSize: 11,
    fontStyle: 'italic',
    color: 'rgb(156, 163, 175)',
  },
  label: {
    fontSize: 14,
    fontFamily: 'Montserrat_600SemiBold',
    color: 'rgb(55, 65, 81)',
    marginBottom: 6,
  },
  inputContainer: {
    borderWidth: 1,
    borderColor: 'rgb(209, 213, 219)',
    borderRadius: 12,
    backgroundColor: 'rgb(249, 250, 251)',
    marginBottom: 8,
    overflow: 'hidden',
  },
  inputAttachBtn: {
    backgroundColor: 'rgb(255, 255, 255)',
    borderRadius: 15,
    padding: 5,
    shadowColor: 'rgb(0, 0, 0)',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
    marginLeft: 10,
  },
  imagePreviewScroll: {
    flex: 1,
  },
  previewThumbnailWrapper: {
    position: 'relative',
    marginRight: 12,
    paddingTop: 4,
  },
  previewThumbnail: {
    width: 40,
    height: 40,
    borderRadius: 8,
  },
  removeThumbnailBtn: {
    position: 'absolute',
    top: -4,
    right: -6,
    backgroundColor: 'rgb(255, 255, 255)',
    borderRadius: 10,
  },
  textArea: {
    padding: 12,
    paddingBottom: 4,
    minHeight: 80,
    fontFamily: 'Montserrat_400Regular',
    fontSize: 13,
    textAlignVertical: 'top',
  },
  footerInsideInput: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'flex-end',
    padding: 8,
  },
  charCount: {
    marginTop: 4,
    fontSize: 11,
    fontFamily: 'Montserrat_400Regular',
    color: 'rgb(156, 163, 175)',
    textAlign: 'right',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  summaryLabel: {
    fontFamily: 'Montserrat_600SemiBold',
    fontSize: 13,
    color: 'rgb(55, 65, 81)',
  },
  summaryValue: {
    fontFamily: 'Montserrat_400Regular',
    fontSize: 13,
    color: 'rgb(16, 32, 15)',
    textAlign: 'right',
    flexShrink: 1,
    marginLeft: 8,
  },
  buttonDock: {
    padding: 16,
    backgroundColor: 'rgb(255, 255, 255)',
    borderTopWidth: 1,
    borderTopColor: 'rgb(229, 231, 235)',
  },
  primaryButton: {
    height: 60,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
  },
  submitButton: {
    backgroundColor: 'rgb(255, 77, 79)',
  },
  recordButton: {
    backgroundColor: 'rgb(109, 170, 26)',
  },
  primaryButtonDisabled: {
    backgroundColor: 'rgb(167, 201, 138)',
  },
  primaryButtonText: {
    marginLeft: 8,
    color: 'rgb(255, 255, 255)',
    fontSize: 14,
    fontFamily: 'Montserrat_700Bold',
  },
})