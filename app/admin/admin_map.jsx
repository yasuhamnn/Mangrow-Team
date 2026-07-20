import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  StyleSheet,
  View,
  Text,
  Dimensions,
  Animated,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  ScrollView,
} from 'react-native'
import { WebView } from 'react-native-webview'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import AdminBottomNav from './AdminBottomNav'
import { useBottomNavMetrics } from '../utils/shared/screenLayout'
import { getApprovedReportsForMap } from '../utils/adminMapBackend'
import { usePullToRefresh } from '../utils/shared/usePullToRefresh'
import ScreenHeader, { HeaderBackButton, screenLayoutStyles } from '../components/ScreenHeader'

const { height } = Dimensions.get('window')

const MAP_TYPES = [
  { id: 'standard', label: 'Standard' },
  { id: 'satellite', label: 'Satellite' },
]

function buildAdminMapHtml(mapType) {
  const safeMapType = ['standard', 'satellite'].includes(mapType) ? mapType : 'standard'
  const isSatellite = safeMapType === 'satellite'

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
          .leaflet-tile-pane { transition: opacity 0.35s ease; }
          .custom-marker {
            width: 12px;
            height: 12px;
            border-radius: 50%;
            background: rgb(239, 68, 68);
          }
          .popup-wrap { min-width: 180px; font-family: sans-serif; }
          .popup-title { font-size: 13px; font-weight: 700; color: rgb(16, 32, 15); margin-bottom: 4px; }
          .popup-address { font-size: 12px; color: rgb(85, 85, 85); line-height: 1.4; }
      </style>
  </head>
  <body>
      <div id="map"></div>
      <script src="https://unpkg.com/leaflet/dist/leaflet.js"></script>
      <script>
          var approvedReports = [];
          var map = L.map('map', { zoomControl: false, minZoom: 10, maxZoom: 19, attributionControl: false });

          var defaultCenter = [11.0519, 124.0055];
          map.setView(defaultCenter, 14);

          var tileUrls = {
            standard: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
            satellite: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
          };

          L.tileLayer(tileUrls.standard, { maxZoom: 19 }).addTo(map);

          var mapReadySent = false;
          function notifyMapReady() {
            if (mapReadySent) return;
            mapReadySent = true;
            if (window.ReactNativeWebView) {
              window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'mapReady' }));
            }
          }

          if (${isSatellite}) {
            var satelliteLayer = L.tileLayer(tileUrls.satellite, { maxZoom: 19, opacity: 0 }).addTo(map);
            satelliteLayer.on('load', function() {
              satelliteLayer.setOpacity(1);
              notifyMapReady();
            });
            setTimeout(notifyMapReady, 12000);
          } else {
            map.whenReady(notifyMapReady);
          }

          var redIcon = L.divIcon({
            className: '',
            html: '<div class="custom-marker"></div>',
            iconSize: [12, 12],
            iconAnchor: [6, 6]
          });

          var markerGroup = L.layerGroup().addTo(map);

          function escapeHtml(str) {
            return String(str || '')
              .replace(/&/g, '&amp;')
              .replace(/</g, '&lt;')
              .replace(/>/g, '&gt;')
              .replace(/"/g, '&quot;');
          }

          function renderMarkers(reports) {
            markerGroup.clearLayers();
            var first = null;
            (reports || []).forEach(function(r) {
              if (!r || r.latitude == null || r.longitude == null) return;
              if (!first) first = r;
              var coords = [Number(r.latitude), Number(r.longitude)];
              var species = r.species || 'Approved Mangrove Area';
              var address = r.formatted_address || r.location_text || (r.latitude + ', ' + r.longitude);
              var popupHtml =
                '<div class="popup-wrap">' +
                  '<div class="popup-title">' + escapeHtml(species) + '</div>' +
                  '<div class="popup-address">' + escapeHtml(address) + '</div>' +
                '</div>';
              L.marker(coords, { icon: redIcon })
                .addTo(markerGroup)
                .bindPopup(popupHtml, { closeButton: true, maxWidth: 260 });
            });
            if (first) {
              map.setView([Number(first.latitude), Number(first.longitude)], 14);
            }
          }

          window.updateMapMarkers = function(reports) {
            approvedReports = reports || [];
            renderMarkers(approvedReports);
          };

          renderMarkers(approvedReports);
      </script>
  </body>
  </html>
  `
}

export default function AdminMap() {
  const router = useRouter()
  const { totalHeight } = useBottomNavMetrics()

  const fadeAnim = useRef(new Animated.Value(0)).current
  const slideAnim = useRef(new Animated.Value(10)).current
  const webViewRef = useRef(null)

  const [approvedReports, setApprovedReports] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [mapType, setMapType] = useState('standard')
  const [mapLoading, setMapLoading] = useState(true)

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 250, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 250, useNativeDriver: true }),
    ]).start()
  }, [])

  const loadReports = useCallback(async ({ silent = false } = {}) => {
    try {
      if (!silent) setIsLoading(true)
      const reports = await getApprovedReportsForMap()
      setApprovedReports(reports || [])
    } catch (e) {
      if (!silent) {
        Alert.alert('Map data error', e?.message || 'Failed to load approved reports and location.')
      }
    } finally {
      if (!silent) setIsLoading(false)
    }
  }, [])

  const { refreshControl } = usePullToRefresh(() => loadReports({ silent: true }))

  useEffect(() => {
    loadReports()
  }, [loadReports])

  const mapHtml = useMemo(() => buildAdminMapHtml(mapType), [mapType])

  useEffect(() => {
    setMapLoading(true)
  }, [mapType])

  const syncMapMarkers = useCallback(() => {
    if (!webViewRef.current) return
    const payload = JSON.stringify(approvedReports || [])
    webViewRef.current.injectJavaScript(`
      if (window.updateMapMarkers) window.updateMapMarkers(${payload});
      true;
    `)
  }, [approvedReports])

  useEffect(() => {
    if (mapLoading) return
    syncMapMarkers()
  }, [approvedReports, mapLoading, syncMapMarkers])

  const handleMapMessage = (event) => {
    try {
      const data = JSON.parse(event.nativeEvent.data)
      if (data?.type === 'mapReady') {
        setMapLoading(false)
        syncMapMarkers()
      }
    } catch {
      // ignore malformed messages
    }
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <Animated.View
        style={{
          flex: 1,
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        }}
      >
        <ScreenHeader
          title="Map"
          right={<HeaderBackButton onPress={() => router.back()} icon="arrow-backward" />}
        />

        <ScrollView
          style={screenLayoutStyles.scrollView}
          contentContainerStyle={{ paddingBottom: totalHeight }}
          showsVerticalScrollIndicator={false}
          refreshControl={refreshControl}
          nestedScrollEnabled
        >
        <View style={styles.mapBox}>
          <WebView
            ref={webViewRef}
            key={`admin-map-${mapType}`}
            originWhitelist={['*']}
            source={{ html: mapHtml }}
            style={{ flex: 1, backgroundColor: 'rgb(232, 239, 227)' }}
            javaScriptEnabled
            domStorageEnabled
            startInLoadingState
            onLoadStart={() => setMapLoading(true)}
            onMessage={handleMapMessage}
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
                onPress={() => setMapType(type.id)}
                activeOpacity={0.85}
              >
                <Text style={[styles.mapTypeText, mapType === type.id && styles.mapTypeTextActive]}>
                  {type.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.legendCard}>
          <View style={styles.legendRow}>
            <View style={styles.redDot} />
            <Text style={styles.legendText}>Approved Mangrove Areas</Text>
          </View>
          <Text style={styles.legendSubtext}>
            {isLoading ? 'Loading reports…' : `Showing ${approvedReports.length} admin-approved location${approvedReports.length === 1 ? '' : 's'}.`}
          </Text>
        </View>
        </ScrollView>
      </Animated.View>

      <AdminBottomNav activeTab="map" />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'rgb(251, 252, 247)',
  },
  mapBox: {
    height: height * 0.60,
    marginHorizontal: 16,
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgb(232, 236, 221)',
    backgroundColor: 'rgb(232, 239, 227)',
    shadowColor: 'rgb(167, 177, 149)',
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
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
  legendCard: {
    marginHorizontal: 16,
    marginTop: 14,
    backgroundColor: 'rgb(255, 255, 255)',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgb(232, 236, 221)',
    padding: 14,
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  redDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: 'rgb(239, 68, 68)',
    marginRight: 10,
  },
  legendText: {
    fontSize: 14,
    color: 'rgb(16, 32, 15)',
    fontFamily: 'Montserrat_600SemiBold',
  },
  legendSubtext: {
    marginTop: 8,
    fontSize: 12,
    color: 'rgb(107, 114, 128)',
    lineHeight: 18,
    fontFamily: 'Montserrat_400Regular',
  },
})
