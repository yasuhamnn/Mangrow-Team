import React from 'react'
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native'
import { WebView } from 'react-native-webview'
import { Feather } from '@expo/vector-icons'
import { EMBEDDED_MAP_HEIGHT, MAP_TYPES } from './mapConstants'

export default function MapPanel({
  mapHtml,
  mapType,
  isFullscreen,
  showUnhealthy,
  showHealthy,
  showUserLocation,
  legendBottom,
  mapLoading,
  webViewRef,
  onMapTypeChange,
  onOpenFullscreen,
  onMapMessage,
  onMapLoadStart,
  interactive = false,
}) {
  return (
    <View style={[
      styles.mapBox,
      isFullscreen && styles.mapBoxFullscreen,
      !isFullscreen && { height: EMBEDDED_MAP_HEIGHT },
    ]}>
      <WebView
        ref={webViewRef}
        key={`map-${isFullscreen ? 'fs' : 'embed'}-${mapType}`}
        originWhitelist={['*']}
        source={{ html: mapHtml }}
        style={{ flex: 1, backgroundColor: 'rgb(232, 239, 227)' }}
        javaScriptEnabled
        domStorageEnabled
        nestedScrollEnabled
        scrollEnabled={interactive || isFullscreen}
        startInLoadingState
        onLoadStart={onMapLoadStart}
        onMessage={onMapMessage}
      />

      {mapLoading && (
        <View style={styles.mapLoadingOverlay} pointerEvents="none">
          <ActivityIndicator size="small" color="rgb(61, 170, 43)" />
          <Text style={styles.mapLoadingText}>
            {mapType === 'satellite' ? 'Loading satellite view…' : 'Loading map…'}
          </Text>
        </View>
      )}

      <View style={styles.mapTypePicker}>
        {MAP_TYPES.map((type) => (
          <TouchableOpacity
            key={type.id}
            style={[styles.mapTypeChip, mapType === type.id && styles.mapTypeChipActive]}
            onPress={() => onMapTypeChange(type.id)}
            activeOpacity={0.85}
          >
            <Text style={[styles.mapTypeText, mapType === type.id && styles.mapTypeTextActive]}>
              {type.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={[styles.mapLegend, { bottom: legendBottom }]}>
        {showUserLocation && (
          <View style={styles.legendItem}>
            <View style={styles.legendUserWrap}>
              <View style={styles.legendUserBeam} />
              <View style={styles.legendUserDot} />
            </View>
            <Text style={styles.legendText}>You & direction</Text>
          </View>
        )}
        {showUnhealthy && (
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: 'rgb(255, 77, 79)' }]} />
            <Text style={styles.legendText}>Unhealthy</Text>
          </View>
        )}
        {showHealthy && (
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: 'rgb(45, 160, 49)' }]} />
            <Text style={styles.legendText}>Healthy</Text>
          </View>
        )}
      </View>

      {!isFullscreen && (
        <TouchableOpacity
          style={styles.expandBtn}
          onPress={onOpenFullscreen}
          activeOpacity={0.85}
        >
          <Feather name="maximize-2" size={16} color="rgb(16, 32, 15)" />
        </TouchableOpacity>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  mapBox: {
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgb(232, 236, 221)',
    backgroundColor: 'rgb(255, 255, 255)',
    shadowColor: 'rgb(167, 177, 149)',
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
    marginBottom: 10,
  },
  mapBoxFullscreen: {
    flex: 1,
    borderRadius: 0,
    borderWidth: 0,
    marginBottom: 0,
  },
  mapTypePicker: {
    position: 'absolute',
    top: 12,
    left: 12,
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: 12,
    padding: 4,
    borderWidth: 1,
    borderColor: 'rgb(232, 236, 221)',
    gap: 4,
  },
  mapTypeChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  mapTypeChipActive: {
    backgroundColor: 'rgb(61, 170, 43)',
  },
  mapTypeText: {
    fontSize: 11,
    fontFamily: 'Montserrat_600SemiBold',
    color: 'rgb(16, 32, 15)',
  },
  mapTypeTextActive: {
    color: 'rgb(255, 255, 255)',
  },
  mapLegend: {
    position: 'absolute',
    right: 12,
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: 'rgb(232, 236, 221)',
    gap: 6,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendUserWrap: {
    width: 14,
    height: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  legendUserBeam: {
    position: 'absolute',
    top: 0,
    width: 0,
    height: 0,
    borderLeftWidth: 4,
    borderRightWidth: 4,
    borderBottomWidth: 7,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: 'rgba(37, 99, 235, 0.55)',
  },
  legendUserDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgb(37, 99, 235)',
    borderWidth: 1,
    borderColor: 'rgb(255, 255, 255)',
    marginTop: 4,
  },
  legendText: {
    fontSize: 11,
    fontFamily: 'Montserrat_600SemiBold',
    color: 'rgb(16, 32, 15)',
  },
  expandBtn: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderWidth: 1,
    borderColor: 'rgb(232, 236, 221)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mapLoadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(232, 239, 227, 0.92)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  mapLoadingText: {
    fontSize: 12,
    fontFamily: 'Montserrat_600SemiBold',
    color: 'rgb(75, 85, 99)',
  },
})
