import * as Location from 'expo-location'
import { useLocalSearchParams, useRouter } from 'expo-router'
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import { WebView } from 'react-native-webview'
import ScreenHeader, {
  HeaderBackButton,
  HeaderSideSpacer,
  screenLayoutStyles,
} from './components/ScreenHeader'
import {
  USER_LOCATION_MARKER_CSS,
  USER_LOCATION_MARKER_SCRIPT,
  resolveDeviceHeading,
} from './utils/mapUserLocationMarker'
import { useResponsiveLayout } from './utils/shared/screenLayout'
import {
  fetchRouteToDestination,
  formatDistance,
  formatDuration,
  getReportDestination,
  isNearDestination,
} from './utils/volunteerResolutionTrackBackend'

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

      function notifyRouteDrawn() {
        if (window.ReactNativeWebView) {
          window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'routeDrawn' }));
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
          notifyRouteDrawn();
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

function getRouteStatusMessage({ locatingUser, routeLoading, routeRendering, mapReady }) {
  if (!mapReady) return 'Loading map…'
  if (locatingUser) return 'Getting your location…'
  if (routeLoading) return 'Finding walking route…'
  if (routeRendering) return 'Drawing route on map…'
  return null
}

export default function ReportResolutionTrack() {
  const router = useRouter()
  const { reportId } = useLocalSearchParams()
  const insets = useSafeAreaInsets()
  const webViewRef = useRef(null)
  const routeDebounceRef = useRef(null)
  const routeRequestIdRef = useRef(0)
  const bottomSafePadding = Math.max(insets.bottom, 16)
  const { rs, horizontalPadding, isCompact } = useResponsiveLayout()

  const [loading, setLoading] = useState(true)
  const [mapReady, setMapReady] = useState(false)
  const [locatingUser, setLocatingUser] = useState(true)
  const [routeLoading, setRouteLoading] = useState(false)
  const [routeRendering, setRouteRendering] = useState(false)
  const [routeIsFallback, setRouteIsFallback] = useState(false)
  const [destination, setDestination] = useState(null)
  const [userLocation, setUserLocation] = useState(null)
  const [userHeading, setUserHeading] = useState(null)
  const [routeCoords, setRouteCoords] = useState([])
  const [distanceMeters, setDistanceMeters] = useState(null)
  const [durationSeconds, setDurationSeconds] = useState(null)
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

  useEffect(() => {
    if (!routeRendering) return undefined
    const timeout = setTimeout(() => setRouteRendering(false), 2500)
    return () => clearTimeout(timeout)
  }, [routeRendering])

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
    const requestId = ++routeRequestIdRef.current
    setRouteLoading(true)
    setRouteRendering(false)

    try {
      const route = await fetchRouteToDestination(origin, dest)
      if (requestId !== routeRequestIdRef.current) return

      setRouteCoords(route.coordinates)
      setDistanceMeters(route.distanceMeters)
      setDurationSeconds(route.durationSeconds)
      setRouteIsFallback(route.isFallback)
      setArrived(isNearDestination(origin, dest))

      if (route.coordinates.length > 1) {
        setRouteRendering(true)
      }
    } catch {
      if (requestId === routeRequestIdRef.current) {
        setRouteCoords([])
        setDistanceMeters(null)
        setDurationSeconds(null)
        setRouteIsFallback(false)
      }
    } finally {
      if (requestId === routeRequestIdRef.current) {
        setRouteLoading(false)
      }
    }
  }, [])

  const scheduleRouteUpdate = useCallback(
    (origin, dest, { immediate = false } = {}) => {
      if (routeDebounceRef.current) {
        clearTimeout(routeDebounceRef.current)
        routeDebounceRef.current = null
      }

      if (immediate) {
        updateRoute(origin, dest)
        return
      }

      routeDebounceRef.current = setTimeout(() => {
        routeDebounceRef.current = null
        updateRoute(origin, dest)
      }, 700)
    },
    [updateRoute]
  )

  useEffect(() => {
    if (reportId) loadDestination()
  }, [reportId, loadDestination])

  useEffect(() => {
    let subscription = null
    let headingSubscription = null
    let mounted = true

    const startTracking = async () => {
      setLocatingUser(true)
      const { status } = await Location.requestForegroundPermissionsAsync()
      if (status !== 'granted') {
        setLocatingUser(false)
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
      setLocatingUser(false)
      if (destination) scheduleRouteUpdate(origin, destination, { immediate: true })

      subscription = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.Balanced, distanceInterval: 8 },
        (pos) => {
          const next = {
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
          }
          setUserLocation(next)
          if (destination) scheduleRouteUpdate(next, destination)
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
      if (routeDebounceRef.current) clearTimeout(routeDebounceRef.current)
      subscription?.remove()
      headingSubscription?.remove()
    }
  }, [destination, scheduleRouteUpdate])

  const handleMapMessage = (event) => {
    try {
      const data = JSON.parse(event.nativeEvent.data)
      if (data?.type === 'mapReady') setMapReady(true)
      if (data?.type === 'routeDrawn') setRouteRendering(false)
    } catch {
      // ignore
    }
  }

  const statusMessage = getRouteStatusMessage({
    locatingUser,
    routeLoading,
    routeRendering,
    mapReady,
  })

  const showMapOverlay = Boolean(statusMessage)

  const distanceLine = useMemo(() => {
    if (locatingUser) return 'Distance: locating you…'
    if (routeLoading) return 'Distance: calculating route…'
    if (routeRendering) return 'Distance: rendering route…'

    const dist = formatDistance(distanceMeters)
    const duration = formatDuration(durationSeconds)
    const parts = [`Distance: ${dist}`]
    if (duration) parts.push(duration)
    if (routeIsFallback) parts.push('(direct line — walking path unavailable)')
    if (arrived) parts.push('· You are near the area')
    return parts.join(' · ')
  }, [
    locatingUser,
    routeLoading,
    routeRendering,
    distanceMeters,
    durationSeconds,
    routeIsFallback,
    arrived,
  ])

  if (loading || !destination || !mapHtml) {
    return (
      <SafeAreaView style={screenLayoutStyles.screenContainer} edges={['top', 'left', 'right']}>
        <ActivityIndicator size="large" color="rgb(109, 170, 26)" style={{ marginTop: 40 }} />
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={screenLayoutStyles.screenContainer} edges={['top', 'left', 'right']}>
      <ScreenHeader
        centered
        title="Track Report Area"
        leading={<HeaderBackButton onPress={() => router.back()} />}
        right={<HeaderSideSpacer />}
      />

      <View style={[styles.mapWrap, { marginHorizontal: horizontalPadding }]}>
        <WebView
          ref={webViewRef}
          originWhitelist={['*']}
          source={{ html: mapHtml }}
          style={styles.map}
          javaScriptEnabled
          domStorageEnabled
          onMessage={handleMapMessage}
        />

        {showMapOverlay && (
          <View style={styles.mapLoadingOverlay} pointerEvents="none">
            <ActivityIndicator size="small" color="rgb(61, 170, 43)" />
            <Text style={[styles.mapLoadingText, { fontSize: rs(12) }]}>{statusMessage}</Text>
          </View>
        )}

        <View style={[styles.legendCard, isCompact && styles.legendCardCompact]}>
          <View style={styles.legendRow}>
            <View style={styles.legendUserWrap}>
              <View style={styles.legendUserBeam} />
              <View style={styles.legendUserDot} />
            </View>
            <Text style={[styles.legendText, { fontSize: rs(10) }]}>You & direction</Text>
          </View>
          <View style={styles.legendRow}>
            <View style={styles.legendDest} />
            <Text style={[styles.legendText, { fontSize: rs(10) }]}>Report destination</Text>
          </View>
          <View style={styles.legendRow}>
            <View style={styles.legendRoute} />
            <Text style={[styles.legendText, { fontSize: rs(10) }]}>Route path</Text>
          </View>
        </View>
      </View>

      <View style={[styles.bottomCard, { paddingBottom: bottomSafePadding, paddingHorizontal: horizontalPadding }]}>
        <Text style={[styles.destTitle, { fontSize: rs(15) }]} numberOfLines={2}>
          {destination.title || 'Report area'}
        </Text>
        <Text style={[styles.destAddress, { fontSize: rs(11) }]} numberOfLines={2}>
          {destination.address || 'Report coordinates'}
        </Text>

        <View style={styles.distanceRow}>
          {(locatingUser || routeLoading || routeRendering) && (
            <ActivityIndicator size="small" color="rgb(52, 162, 50)" style={styles.distanceSpinner} />
          )}
          <Text style={[styles.distanceText, { fontSize: rs(12) }]} numberOfLines={3}>
            {distanceLine}
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.primaryBtn, { paddingVertical: rs(14), minHeight: rs(48) }, !arrived && styles.primaryBtnMuted]}
          activeOpacity={0.85}
          onPress={() =>
            router.push({
              pathname: '/report_resolution_submit',
              params: {
                reportId,
                latitude: userLocation?.latitude,
                longitude: userLocation?.longitude,
              },
            })
          }
        >
          <Text
            style={[styles.primaryBtnText, { fontSize: rs(14), lineHeight: rs(20) }]}
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
  mapWrap: {
    flex: 1,
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: 'rgb(232, 239, 227)',
  },
  map: { flex: 1 },
  mapLoadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(232, 239, 227, 0.88)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingHorizontal: 24,
  },
  mapLoadingText: {
    fontFamily: 'Montserrat_600SemiBold',
    color: 'rgb(55, 65, 81)',
    textAlign: 'center',
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
    maxWidth: '52%',
  },
  legendCardCompact: {
    top: 8,
    right: 8,
    padding: 8,
    maxWidth: '58%',
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
  legendText: { fontFamily: 'Montserrat_600SemiBold', color: 'rgb(55, 65, 81)', flexShrink: 1 },
  bottomCard: {
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgb(232, 236, 221)',
    backgroundColor: 'rgb(255, 255, 255)',
  },
  destTitle: { fontFamily: 'Montserrat_700Bold', color: 'rgb(16, 32, 15)' },
  destAddress: { fontFamily: 'Montserrat_400Regular', color: 'rgb(107, 114, 128)', marginTop: 4 },
  distanceRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 8,
    marginBottom: 12,
    minHeight: 20,
  },
  distanceSpinner: { marginRight: 8, marginTop: 1 },
  distanceText: {
    flex: 1,
    fontFamily: 'Montserrat_600SemiBold',
    color: 'rgb(52, 162, 50)',
  },
  primaryBtn: {
    backgroundColor: 'rgb(109, 170, 26)',
    borderRadius: 14,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: 'rgb(109, 170, 26)',
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  primaryBtnMuted: { backgroundColor: 'rgb(143, 191, 74)' },
  primaryBtnText: {
    color: 'rgb(255, 255, 255)',
    fontFamily: 'Montserrat_700Bold',
    textAlign: 'center',
  },
})
