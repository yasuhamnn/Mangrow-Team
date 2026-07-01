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
import * as ImagePicker from 'expo-image-picker'
import * as Location from 'expo-location'
import { formatLocationAddress } from './utils/shared/locationFormat'
import { getCurrentLocationWithAddress } from './utils/locationService'
import { reverseGeocodeToArea } from './utils/locationService'
import { Ionicons } from '@expo/vector-icons'
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router'
import CameraFrameGuide from './components/CameraFrameGuide'
import CameraPreviewLayer from './components/CameraPreviewLayer'

// location formatting moved to app/utils/locationService.js


export default function HealthCamera() {
  const [permission, requestPermission] = useCameraPermissions()
  const [locationPermission, setLocationPermission] = useState(null)
  const [isCapturing, setIsCapturing] = useState(false)
  const [flash, setFlash] = useState('off')
  const [capturedImageUri, setCapturedImageUri] = useState(null)
  const [isCameraReady, setIsCameraReady] = useState(false)
  const [cameraKey, setCameraKey] = useState(0)
  const [coords, setCoords] = useState(null)
  const [bestCoords, setBestCoords] = useState(null)
  const [bestAccuracy, setBestAccuracy] = useState(null)
  const [isFocused, setIsFocused] = useState(false)

  const cameraRef = useRef(null)
  const router = useRouter()
  const params = useLocalSearchParams()

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
    let subscription
    ;(async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync()
        const servicesEnabled = await Location.hasServicesEnabledAsync()
        const granted = status === 'granted' && servicesEnabled
        setLocationPermission(granted)

        if (granted) {
          subscription = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.Highest,
            timeInterval: 2000,
            distanceInterval: 2,
          },
          (location) => {
            // Only update UI state if coordinates changed significantly (roughly every ~2 meters)
            setCoords(prev => {
              if (!prev || Math.abs(prev.latitude - location.coords.latitude) > 0.0001) {
                return location.coords
              }
              return prev
            })
            if (typeof location?.coords?.accuracy === 'number') {
              setBestCoords((prev) => {
                const prevAcc = typeof prev?.accuracy === 'number' ? prev.accuracy : Infinity
                const nextAcc = location.coords.accuracy
                if (nextAcc < prevAcc) {
                  setBestAccuracy(nextAcc)
                  return location.coords
                }
                return prev
              })
            }
          }
        )
      }
      } catch (e) {
        setLocationPermission(false)
      }
    })()

    return () => subscription && subscription.remove()
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
          We need camera and location permissions to capture leaf photos.
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

      const photo = await cameraRef.current.takePictureAsync({ quality: 0.8, exif: true })
      setCapturedImageUri(photo.uri)

      let location = null
      try {
        const servicesEnabled = await Location.hasServicesEnabledAsync()
        if (servicesEnabled) {
          location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High })
        }
      } catch (e) {
        console.warn('Could not fetch location during capture', e)
      }

      const latitude = location?.coords?.latitude ?? 0
      const longitude = location?.coords?.longitude ?? 0
      const timestamp = new Date().toISOString()

      let addressData = {}
      try {
        const [address] = await Location.reverseGeocodeAsync({ latitude, longitude })
        if (address) {
          addressData = {
            street: address.street || address.name,
            purok: address.name,
            barangay: address.district,
            subregion: address.subregion,
            city: address.city,
            locationName: address.name,
            formattedAddress: formatLocationAddress({
              purok: address.name,
              street: address.street || address.name,
              barangay: address.district,
              city: address.city,
              subregion: address.subregion,
            }),
          }
        }
      } catch (geocodeError) {
        console.warn('Geocoding failed during capture:', geocodeError)
      }

      router.push({
        pathname: '/health_results',
        params: {
          ...params,
          imageUri: photo.uri,
          timestamp,
          latitude: latitude.toFixed(6),
          longitude: longitude.toFixed(6),
          ...addressData,
          locationName: addressData.locationName,
        },
      })
    } catch (error) {
      Alert.alert('Error', 'Failed to capture leaf photo or get location.')
      console.error(error)
    } finally {
      setIsCapturing(false)
    }
  }

  const pickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Gallery access is required.')
        return
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
      })
      if (!result.canceled) {
        router.push({
          pathname: '/health_results',
          params: {
            ...params,
            imageUri: result.assets[0].uri,
            timestamp: new Date().toISOString(),
          },
        })
      }
    } catch (error) {
      Alert.alert('Error', 'An error occurred while picking the image.')
    }
  }

  const gpsLabel = bestCoords
    ? `${bestCoords.latitude.toFixed(6)}, ${bestCoords.longitude.toFixed(6)}`
    : coords
      ? `${coords.latitude.toFixed(6)}, ${coords.longitude.toFixed(6)}`
      : 'Detecting GPS...'

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
              onPress={() => router.back()}
            >
              <Ionicons name="arrow-back" size={18} color="rgb(255, 255, 255)" />
            </TouchableOpacity>
            <View style={styles.statusPill}>
              <Ionicons name="location-sharp" size={14} color="rgb(85, 210, 48)" />
              <Text style={styles.statusText}>{gpsLabel}</Text>
            </View>
            <View style={styles.topButtonSpacer} />
          </>
        }
        frameGuide={<CameraFrameGuide label="Align leaves on the box" variant="tall" />}
      />

      <View style={styles.controlDock}>
        <View style={styles.controlRow}>
          <TouchableOpacity style={styles.galleryButton} onPress={pickImage} activeOpacity={0.85}>
            <Ionicons name="image-outline" size={23} color="rgb(255, 255, 255)" />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.captureButton, (isCapturing || !isCameraReady) && styles.captureButtonDisabled]}
            onPress={takePicture}
            disabled={isCapturing || !isCameraReady}
            activeOpacity={0.86}
          >
            <View style={styles.captureInner}>
              {isCapturing ? <ActivityIndicator color="rgb(255, 255, 255)" /> : <Ionicons name="camera-outline" size={24} color="rgb(255, 255, 255)" />}
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
        <Text style={styles.dockHint}>GPS & timestamp are embedded automatically.</Text>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'rgb(0, 0, 0)' },
  backButton: {
    width: 30,
    height: 30,
    borderRadius: 10,
    backgroundColor: 'rgba(31, 38, 34, 0.82)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.16)',
  },
  topButtonSpacer: { 
    width: 34, 
    height: 34 
  },

  statusPill: { 
    minWidth: 198, 
    height: 34, 
    borderRadius: 10, 
    paddingHorizontal: 13, 
    backgroundColor: 'rgba(31,38,34,0.82)', 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center', 
    gap: 5, borderWidth: 1, 
    borderColor: 'rgba(255,255,255,0.16)' 
  },

  statusText: { 
    color: 'rgb(255, 255, 255)', 
    fontFamily: 'Montserrat_700Bold', 
    fontSize: 12 
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
    opacity: 0.7 
  },

  captureInner: { 
    width: 56, 
    height: 56, 
    borderRadius: 28, 
    backgroundColor: 'rgb(62, 170, 43)', 
    justifyContent: 'center', 
    alignItems: 'center'
   },

  dockHint: {
    marginTop: 18,
    color: 'rgb(184, 199, 231)',
    fontFamily: 'Montserrat_400Regular',
    fontSize: 11,
    lineHeight: 14,
    textAlign: 'center',
  },
  centered: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center' 
  },

  permissionContainer: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center', 
    paddingHorizontal: 28, 
    backgroundColor: 'rgb(0, 0, 0)' 
  },

  permissionButton: { 
    backgroundColor: 'rgb(109, 170, 26)', 
    paddingHorizontal: 24, 
    paddingVertical: 12, 
    borderRadius: 24, 
    marginTop: 16 
  },

  permissionButtonText: { 
    color: 'rgb(255, 255, 255)', 
    fontFamily: 'Montserrat_700Bold' 
  },

  message: { 
    color: 'rgb(255, 255, 255)', 
    fontFamily: 'Montserrat_400Regular', 
    fontSize: 14, 
    textAlign: 'center', 
    marginBottom: 20 
  },
})