import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native'
import { WebView } from 'react-native-webview'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import * as Location from 'expo-location'
import { useLocalSearchParams, useRouter } from 'expo-router'
import {
  fetchRouteToDestination,
  formatDistance,
  getReportDestination,
  isNearDestination,
} from './utils/volunteerResolutionTrackBackend'
import {
  USER_LOCATION_MARKER_CSS,
  USER_LOCATION_MARKER_SCRIPT,
  resolveDeviceHeading,
} from './utils/mapUserLocationMarker'

function buildTrackMapHtml(destination) {
  const lat = Number(destination.latitude)
  const lng = Number(destination.longitude)

  return `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <link rel="stylesheet" href="https://unpkg.com/leaflet/dist/leaflet.css" />
    <style>
      html, body, #map { height: 100%; margin: 0; padding: 0; }
      .leaflet-container { background: rgb(232, 239, 227); }
      .leaflet-control-zoom { display: none !important; }
      ${USER_LOCATION_MARKER_CSS}
      .dest-marker {
        width: 14px; height: 14px; border-radius: 50%;
        background: rgb(255, 59, 48);
      }
    </style>
  </head>
  <body>
    <div id="map"></div>
    <script src="https://unpkg.com/leaflet/dist/leaflet.js"></script>
    <script>
      var destination = [${lat}, ${lng}];
      var map = L.map('map', { zoomControl: false, minZoom: 10, maxZoom: 19, attributionControl: false });
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(map);

      var destIcon = L.divIcon({
        className: '',
        html: '<div class="dest-marker"></div>',
        iconSize: [14, 14],
        iconAnchor: [7, 7]
      });

      var destMarker = L.marker(destination, { icon: destIcon }).addTo(map);
      var routeLine = null;
      var mapReadySent = false;

      ${USER_LOCATION_MARKER_SCRIPT}

      function notifyMapReady() {
        if (mapReadySent) return;
        mapReadySent = true;
        if (window.ReactNativeWebView) {
          window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'mapReady' }));
        }
      }

      window.updateTracking = function(payload) {
        var user = payload && payload.user;
        var route = (payload && payload.route) || [];

        window.updateUserLocation({ user: user });

        if (routeLine) {
          map.removeLayer(routeLine);
          routeLine = null;
        }

        if (route.length > 1) {
          var latlngs = route.map(function(p) {
            return [Number(p.latitude), Number(p.longitude)];
          });
          routeLine = L.polyline(latlngs, { color: 'rgb(52, 162, 50)', weight: 5, opacity: 0.9 }).addTo(map);
          var bounds = routeLine.getBounds();
          if (destMarker) bounds.extend(destMarker.getLatLng());
          if (userMarker) bounds.extend(userMarker.getLatLng());
          map.fitBounds(bounds, { padding: [40, 40] });
        } else if (userMarker) {
          map.fitBounds(L.latLngBounds([userMarker.getLatLng(), destMarker.getLatLng()]), { padding: [40, 40] });
        } else {
          map.setView(destination, 15);
        }
      };

      map.setView(destination, 15);
      map.whenReady(notifyMapReady);
    </script>
  </body>
  </html>
  `
}

export default function ReportResolutionTrack() {
  const router = useRouter()
  const { reportId } = useLocalSearchParams()
  const insets = useSafeAreaInsets()
  const webViewRef = useRef(null)
  const bottomSafePadding = Math.max(insets.bottom, 16)

  const [loading, setLoading] = useState(true)
  const [mapReady, setMapReady] = useState(false)
  const [destination, setDestination] = useState(null)
  const [userLocation, setUserLocation] = useState(null)
  const [userHeading, setUserHeading] = useState(null)
  const [routeCoords, setRouteCoords] = useState([])
  const [distanceMeters, setDistanceMeters] = useState(null)
  const [arrived, setArrived] = useState(false)

  const mapHtml = useMemo(
    () => (destination ? buildTrackMapHtml(destination) : null),
    [destination]
  )

  const syncMap = useCallback(() => {
    if (!webViewRef.current || !mapReady) return
    const payload = JSON.stringify({
      user: userLocation
        ? {
            latitude: userLocation.latitude,
            longitude: userLocation.longitude,
            heading: userHeading,
          }
        : null,
      route: routeCoords,
    })
    webViewRef.current.injectJavaScript(`
      if (window.updateTracking) window.updateTracking(${payload});
      true;
    `)
  }, [mapReady, userLocation, userHeading, routeCoords])

  useEffect(() => {
    syncMap()
  }, [syncMap])

  const loadDestination = useCallback(async () => {
    try {
      setLoading(true)
      const report = await getReportDestination(reportId)
      setDestination({
        latitude: Number(report.latitude),
        longitude: Number(report.longitude),
        title: report.species,
        address: report.formatted_address,
      })
    } catch (e) {
      Alert.alert('Error', e?.message || 'Failed to load report location.')
      router.back()
    } finally {
      setLoading(false)
    }
  }, [reportId, router])

  const updateRoute = useCallback(async (origin, dest) => {
    const route = await fetchRouteToDestination(origin, dest)
    setRouteCoords(route.coordinates)
    setDistanceMeters(route.distanceMeters)
    setArrived(isNearDestination(origin, dest))
  }, [])

  useEffect(() => {
    if (reportId) loadDestination()
  }, [reportId, loadDestination])

  useEffect(() => {
    let subscription = null
    let headingSubscription = null
    let mounted = true

    const startTracking = async () => {
      const { status } = await Location.requestForegroundPermissionsAsync()
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Location access is required to track the report area.')
        return
      }

      const current = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced })
      if (!mounted) return

      const origin = {
        latitude: current.coords.latitude,
        longitude: current.coords.longitude,
      }
      setUserLocation(origin)
      if (destination) await updateRoute(origin, destination)

      subscription = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.Balanced, distanceInterval: 8 },
        (pos) => {
          const next = {
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
          }
          setUserLocation(next)
          if (destination) updateRoute(next, destination)
        }
      )

      headingSubscription = await Location.watchHeadingAsync((heading) => {
        const deg = resolveDeviceHeading(heading)
        if (deg != null) setUserHeading(deg)
      })
    }

    if (destination) startTracking()
    return () => {
      mounted = false
      subscription?.remove()
      headingSubscription?.remove()
    }
  }, [destination, updateRoute])

  const handleMapMessage = (event) => {
    try {
      const data = JSON.parse(event.nativeEvent.data)
      if (data?.type === 'mapReady') setMapReady(true)
    } catch {
      // ignore
    }
  }

  if (loading || !destination || !mapHtml) {
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
        <Text style={styles.title}>Track Report Area</Text>
        <View style={{ width: 38 }} />
      </View>

      <View style={styles.mapWrap}>
        <WebView
          ref={webViewRef}
          originWhitelist={['*']}
          source={{ html: mapHtml }}
          style={styles.map}
          javaScriptEnabled
          domStorageEnabled
          onMessage={handleMapMessage}
        />

        {!mapReady && (
          <View style={styles.mapLoadingOverlay} pointerEvents="none">
            <ActivityIndicator size="small" color="rgb(61, 170, 43)" />
            <Text style={styles.mapLoadingText}>Loading map…</Text>
          </View>
        )}

        <View style={styles.legendCard}>
          <View style={styles.legendRow}>
            <View style={styles.legendUserWrap}>
              <View style={styles.legendUserBeam} />
              <View style={styles.legendUserDot} />
            </View>
            <Text style={styles.legendText}>You & direction</Text>
          </View>
          <View style={styles.legendRow}>
            <View style={styles.legendDest} />
            <Text style={styles.legendText}>Report destination</Text>
          </View>
          <View style={styles.legendRow}>
            <View style={styles.legendRoute} />
            <Text style={styles.legendText}>Route path</Text>
          </View>
        </View>
      </View>

      <View style={[styles.bottomCard, { paddingBottom: bottomSafePadding }]}>
        <Text style={styles.destTitle} numberOfLines={2}>
          {destination.title || 'Report area'}
        </Text>
        <Text style={styles.destAddress} numberOfLines={2}>
          {destination.address || 'Report coordinates'}
        </Text>
        <Text style={styles.distanceText} numberOfLines={2}>
          Distance: {formatDistance(distanceMeters)}
          {arrived ? ' · You are near the area' : ''}
        </Text>

        <TouchableOpacity
          style={[styles.primaryBtn, !arrived && styles.primaryBtnMuted]}
          activeOpacity={0.85}
          onPress={() => router.push({
            pathname: '/report_resolution_submit',
            params: {
              reportId,
              latitude: userLocation?.latitude,
              longitude: userLocation?.longitude,
            },
          })}
        >
          <Text
            style={styles.primaryBtnText}
            numberOfLines={2}
            adjustsFontSizeToFit
            minimumFontScale={0.85}
          >
            {arrived ? 'Submit resolution proof →' : 'Submit resolution proof anyway →'}
          </Text>
        </TouchableOpacity>
      </View>
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
  title: { fontSize: 18, fontFamily: 'Montserrat_700Bold', color: 'rgb(16, 32, 15)' },
  mapWrap: { flex: 1, marginHorizontal: 14, borderRadius: 18, overflow: 'hidden', backgroundColor: 'rgb(232, 239, 227)' },
  map: { flex: 1 },
  mapLoadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(232, 239, 227, 0.92)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  mapLoadingText: {
    fontSize: 12,
    fontFamily: 'Montserrat_600SemiBold',
    color: 'rgb(75, 85, 99)',
  },
  legendCard: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgb(232, 236, 221)',
    padding: 10,
    gap: 6,
  },
  legendRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
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
  legendDest: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: 'rgb(255, 59, 48)',
  },
  legendRoute: {
    width: 18,
    height: 3,
    borderRadius: 2,
    backgroundColor: 'rgb(52, 162, 50)',
  },
  legendText: { fontSize: 10, fontFamily: 'Montserrat_600SemiBold', color: 'rgb(55, 65, 81)' },
  bottomCard: {
    paddingTop: 16,
    paddingHorizontal: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgb(232, 236, 221)',
    backgroundColor: 'rgb(255, 255, 255)',
  },
  destTitle: { fontSize: 15, fontFamily: 'Montserrat_700Bold', color: 'rgb(16, 32, 15)' },
  destAddress: { fontSize: 11, fontFamily: 'Montserrat_400Regular', color: 'rgb(107, 114, 128)', marginTop: 4 },
  distanceText: {
    fontSize: 12,
    fontFamily: 'Montserrat_600SemiBold',
    color: 'rgb(52, 162, 50)',
    marginTop: 8,
    marginBottom: 12,
  },
  primaryBtn: {
    backgroundColor: 'rgb(109, 170, 26)',
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 12,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnMuted: { backgroundColor: 'rgb(143, 191, 74)' },
  primaryBtnText: {
    color: 'rgb(255, 255, 255)',
    fontFamily: 'Montserrat_700Bold',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
})
