import { forwardRef, memo, useCallback } from 'react'
import { Image, Platform, StyleSheet, View } from 'react-native'
import { CameraView } from 'expo-camera'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

const CameraPreviewLayer = memo(
  forwardRef(function CameraPreviewLayer(
    { flash, isActive, cameraKey, isCapturing, capturedImageUri, topBar, frameGuide, onReadyChange },
    ref
  ) {
    const insets = useSafeAreaInsets()

    const handleCameraReady = useCallback(() => {
      onReadyChange?.(true)
    }, [onReadyChange])

    const handleMountError = useCallback((event) => {
      console.error('Camera mount error:', event?.message)
      onReadyChange?.(false)
    }, [onReadyChange])

    if (!isActive) {
      return <View style={styles.previewPane} />
    }

    return (
      <View style={styles.previewPane}>
        <CameraView
          key={cameraKey}
          ref={ref}
          style={styles.camera}
          facing="back"
          mode="picture"
          flash={flash}
          ratio={Platform.OS === 'android' ? '16:9' : undefined}
          onCameraReady={handleCameraReady}
          onMountError={handleMountError}
        />

        {isCapturing && !capturedImageUri ? (
          <View style={styles.frozenPreview} />
        ) : null}

        {capturedImageUri ? (
          <Image source={{ uri: capturedImageUri }} style={styles.frozenPreview} />
        ) : null}

        <View style={[styles.topBar, { paddingTop: insets.top + 12 }]} pointerEvents="box-none">
          {topBar}
        </View>

        {frameGuide}
      </View>
    )
  })
)

export default CameraPreviewLayer

const styles = StyleSheet.create({
  previewPane: {
    flex: 1,
    minHeight: 340,
    backgroundColor: 'rgb(0, 0, 0)',
    overflow: 'hidden',
  },
  camera: {
    ...StyleSheet.absoluteFillObject,
  },
  frozenPreview: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 2,
  },
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 3,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 22,
  },
})
