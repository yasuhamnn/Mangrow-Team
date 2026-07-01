import React, { useState, useEffect, useRef, useCallback } from 'react'
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native'
import { useCameraPermissions } from 'expo-camera'
import * as Location from 'expo-location'
import * as ImagePicker from 'expo-image-picker'
import { getCurrentLocationWithAddress, reverseGeocodeToArea } from './utils/locationService'
import { Ionicons } from '@expo/vector-icons'
import { useRouter, useFocusEffect } from 'expo-router'
import CameraFrameGuide from './components/CameraFrameGuide'
import CameraPreviewLayer from './components/CameraPreviewLayer'

const CameraScreen = () => {
  const [permission, requestPermission] = useCameraPermissions()
  const [locationPermission, setLocationPermission] = useState(null)
  const [isCapturing, setIsCapturing] = useState(false)
  const [flash, setFlash] = useState('off')
  const [capturedImageUri, setCapturedImageUri] = useState(null)
  const [isCameraReady, setIsCameraReady] = useState(false)
  const [cameraKey, setCameraKey] = useState(0)
  const cameraRef = useRef(null)
  const router = useRouter()
  const [isFocused, setIsFocused] = useState(false)

  useFocusEffect(
    useCallback(() => {
      setIsFocused(true)
      setCapturedImageUri(null)
      setIsCapturing(false)
      setIsCameraReady(false)
      setCameraKey((key) => key + 1)
      return () => setIsFocused(false)
    }, [])
  )

  useEffect(() => {
    ;(async () => {
      try {
        const enabled = await Location.hasServicesEnabledAsync()
        if (!enabled) return setLocationPermission(false)
        const { status } = await Location.getForegroundPermissionsAsync()
        setLocationPermission(status === 'granted')
      } catch (e) {
        setLocationPermission(false)
      }
    })()
  }, [])

  if (!permission) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="rgb(109, 170, 26)" />
      </View>
    )
  }

  if (!permission.granted || locationPermission === false) {
    return (
      <View style={styles.permissionContainer}>
        <Text style={styles.message}>
          We need camera and location permissions to geo-tag mangrove photos.
        </Text>
        <TouchableOpacity
          style={styles.permissionButton}
          onPress={async () => {
            await requestPermission()
            const { status } = await Location.requestForegroundPermissionsAsync()
            setLocationPermission(status === 'granted')
          }}
        >
          <Text style={styles.permissionButtonText}>Grant Permissions</Text>
        </TouchableOpacity>
      </View>
    )
  }

  const takePicture = async () => {
    if (!cameraRef.current || isCapturing || !isCameraReady) return

    try {
      setIsCapturing(true)

      // 1. Trigger the shutter immediately
      const photo = await cameraRef.current.takePictureAsync({
        exif: true,
        quality: 0.8,
      })

      // Show the captured image immediately to "freeze" the view
      setCapturedImageUri(photo.uri)

      // 2. Fetch location while the screen shows the static image
      const locationData = await getCurrentLocationWithAddress()

      if (!locationData) {
        setIsCapturing(false)
        setCapturedImageUri(null)
        Alert.alert('Location Error', 'Failed to get GPS coordinates. Please ensure location services are enabled.')
        return
      }

      const { latitude, longitude } = locationData
      const timestamp = new Date().toISOString()

      console.log('Captured Geo-Tagged Image:', {
        uri: photo.uri,
        lat: latitude,
        lng: longitude,
        timestamp,
        ...locationData,
      })

      router.push({
        pathname: '/species_with_gps_coordinates_result',
        params: {
          imageUri: photo.uri,
          latitude: latitude.toFixed(6),
          longitude: longitude.toFixed(6),
          timestamp,
          street: locationData.street,
          purok: locationData.purok,
          barangay: locationData.barangay,
          city: locationData.city,
          province: locationData.province,
          region: locationData.region,
          country: locationData.country,
          postalCode: locationData.postalCode,
          formattedAddress: locationData.formattedAddress,
          speciesName: '',
          description: '',
          referenceImageUri: '',
        },
      })

    } catch (error) {
      Alert.alert('Error', 'Failed to capture geo-tagged image.')
      console.error(error)
    } finally {
      setIsCapturing(false)
    }
  }

  const pickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()
      
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Permission to access gallery is required to upload photos.')
        return
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
      })

      if (!result.canceled) {
        router.push({
          pathname: '/species_with_gps_coordinates_result',
          params: {
            imageUri: result.assets[0].uri,
            timestamp: new Date().toISOString(),
            speciesName: '',       // blank placeholder
            description: '',       // blank placeholder
            referenceImageUri: '', // blank placeholder
            formattedAddress: 'Uploaded from Gallery',
          },
        })
      }

    } catch (error) {
      Alert.alert('Error', 'An error occurred while picking the image.')
    }
  }

  return (
    <View style={styles.container}>
      <CameraPreviewLayer
        ref={cameraRef}
        flash={flash}
        isActive={isFocused}
        cameraKey={cameraKey}
        isCapturing={isCapturing}
        capturedImageUri={capturedImageUri}
        onReadyChange={setIsCameraReady}
        topBar={
          <>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => router.replace('/dashboard')}
              activeOpacity={0.8}
            >
              <Ionicons name="arrow-back" size={18} color="rgb(255, 255, 255)" />
            </TouchableOpacity>
            <Text style={styles.topTitle}>Species Identifier</Text>
            <View style={styles.topButtonSpacer} />
          </>
        }
        frameGuide={<CameraFrameGuide label="Align camera with leaf" variant="tall" />}
      />

      <View style={styles.controlDock}>
        <View style={styles.controlRow}>
          <TouchableOpacity 
            style={styles.galleryButton} 
            onPress={pickImage}
            activeOpacity={0.85}
          >
            <Ionicons name="image-outline" size={23} color="rgb(255, 255, 255)" />
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.captureButton,
              (isCapturing || !isCameraReady) && styles.captureButtonDisabled,
            ]}
            onPress={takePicture}
            disabled={isCapturing || !isCameraReady}
            activeOpacity={0.86}
          >
            <View style={styles.captureInner}>
              {isCapturing ? (
                <ActivityIndicator color="rgb(255, 255, 255)" />
              ) : (
                <Ionicons name="camera-outline" size={24} color="rgb(255, 255, 255)" />
              )}
            </View>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.flashButton} 
            onPress={() => setFlash(prev => (prev === 'off' ? 'on' : 'off'))}
            activeOpacity={0.85}
          >
            <Ionicons name={flash === 'on' ? 'flash' : 'flash-off-outline'} size={23} color="rgb(255, 255, 255)" />
          </TouchableOpacity>
        </View>

        <Text style={styles.dockHint}>
          GPS & timestamp are embedded automatically.
        </Text>
      </View>
    </View>
  )
}

export default CameraScreen

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'rgb(0, 0, 0)',
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 28,
    backgroundColor: 'rgb(0, 0, 0)',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgb(251, 252, 247)',
  },
  backButton: {
    width: 30,
    height: 30,
    borderRadius: 10,
    backgroundColor: 'rgba(21, 30, 28, 0.72)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  topButtonSpacer: {
    width: 44,
    height: 44,
  },
  topTitle: {
    color: 'rgb(255, 255, 255)',
    fontFamily: 'Montserrat_700Bold',
    fontSize: 15,
    textAlign: 'center',
  },
  
  statusPill: {
    minWidth: 198,
    height: 34,
    borderRadius: 20,
    paddingHorizontal: 13,
    backgroundColor: 'rgba(31, 38, 34, 0.82)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.16)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
  },
  statusText: {
    color: 'rgb(255, 255, 255)',
    fontFamily: 'Montserrat_700Bold',
    fontSize: 12,
    lineHeight: 14,
  },
  controlDock: {
    height: 186,
    backgroundColor: 'rgb(0, 0, 0)',
    alignItems: 'center',
    paddingTop: 28,
    paddingBottom: 28,
  },
  controlRow: {
    width: 230,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  galleryButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgb(28, 28, 28)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  flashButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgb(28, 28, 28)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  captureButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: 'rgb(255, 255, 255)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  captureButtonDisabled: {
    opacity: 0.7,
  },
  captureInner: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgb(62, 170, 43)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sideButtonSpacer: {
    width: 44,
    height: 44,
  },
  dockHint: {
    marginTop: 18,
    color: 'rgb(184, 199, 231)',
    fontFamily: 'Montserrat_400Regular',
    fontSize: 11,
    lineHeight: 14,
    textAlign: 'center',
  },
  message: {
    textAlign: 'center',
    fontFamily: 'Montserrat_400Regular',
    color: 'rgb(232, 239, 234)',
    marginBottom: 20,
    lineHeight: 20,
  },
  permissionButton: {
    backgroundColor: 'rgb(109, 170, 26)',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
    alignSelf: 'center',
  },
  permissionButtonText: {
    color: 'rgb(255, 255, 255)',
    fontFamily: 'Montserrat_700Bold',
  },
})