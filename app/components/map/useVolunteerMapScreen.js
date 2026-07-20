import * as Location from 'expo-location'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Animated } from 'react-native'
import { supabase } from '../../../supabaseClient'
import {
    getReportedLocationsForVolunteerMap,
    subscribeToMapReports,
} from '../../utils/mapBackend'
import { resolveDeviceHeading } from '../../utils/mapUserLocationMarker'
import { filterReportsByChip, filterReportsForMap } from './mapConstants'
import { buildVolunteerMapHtml } from './volunteerMapHtml'
import { usePullToRefresh } from '../../utils/shared/usePullToRefresh'

export function useVolunteerMapScreen() {
  const router = useRouter()
  const { scrollToList } = useLocalSearchParams()

  const [activeFilter, setActiveFilter] = useState('All')
  const [mapType, setMapType] = useState('standard')
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [showUnhealthy, setShowUnhealthy] = useState(true)
  const [showHealthy, setShowHealthy] = useState(true)
  const fadeAnim = useRef(new Animated.Value(0)).current
  const slideAnim = useRef(new Animated.Value(10)).current
  const embeddedWebViewRef = useRef(null)
  const fullscreenWebViewRef = useRef(null)
  const scrollRef = useRef(null)
  const reportListScrollY = useRef(0)

  const [volunteerReports, setVolunteerReports] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [mapLoading, setMapLoading] = useState(true)
  const [userLocation, setUserLocation] = useState(null)
  const [userHeading, setUserHeading] = useState(null)
  const [hasLocationAccess, setHasLocationAccess] = useState(false)

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 250, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 250, useNativeDriver: true }),
    ]).start()
  }, [fadeAnim, slideAnim])

  const loadReports = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setIsLoading(true)
    try {
      const reports = await getReportedLocationsForVolunteerMap()
      setVolunteerReports(reports || [])
    } catch {
      setVolunteerReports([])
    } finally {
      if (!silent) setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadReports()
  }, [loadReports])

  useEffect(() => {
    let positionSub = null
    let headingSub = null
    let mounted = true

    const startLocationTracking = async () => {
      const { status } = await Location.requestForegroundPermissionsAsync()
      if (!mounted) return
      if (status !== 'granted') {
        setHasLocationAccess(false)
        return
      }

      setHasLocationAccess(true)

      const current = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced })
      if (!mounted) return
      setUserLocation({
        latitude: current.coords.latitude,
        longitude: current.coords.longitude,
      })

      positionSub = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.Balanced, distanceInterval: 5 },
        (pos) => {
          setUserLocation({
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
          })
        }
      )

      headingSub = await Location.watchHeadingAsync((heading) => {
        const deg = resolveDeviceHeading(heading)
        if (deg != null) setUserHeading(deg)
      })
    }

    startLocationTracking()

    return () => {
      mounted = false
      positionSub?.remove()
      headingSub?.remove()
    }
  }, [])

  useEffect(() => {
    const subscription = subscribeToMapReports(() => {
      loadReports({ silent: true })
    }, 'volunteer-map')
    return () => {
      if (subscription) supabase.removeChannel(subscription)
    }
  }, [loadReports])

  useEffect(() => {
    if (scrollToList !== '1' && scrollToList !== 'true') return
    if (isLoading) return

    const scrollToReports = () => {
      scrollRef.current?.scrollTo({
        y: Math.max(reportListScrollY.current, 0),
        animated: true,
      })
    }

    const t1 = setTimeout(scrollToReports, 250)
    const t2 = setTimeout(scrollToReports, 700)

    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
    }
  }, [scrollToList, isLoading, volunteerReports.length])

  const filteredReports = useMemo(
    () => filterReportsByChip(volunteerReports, activeFilter),
    [volunteerReports, activeFilter]
  )

  const mapReports = useMemo(
    () => filterReportsForMap(volunteerReports, { showHealthy, showUnhealthy }),
    [volunteerReports, showHealthy, showUnhealthy]
  )

  const mapHtml = useMemo(() => buildVolunteerMapHtml([], mapType), [mapType])

  useEffect(() => {
    setMapLoading(true)
  }, [mapType, isFullscreen])

  const syncMapMarkers = useCallback(() => {
    const ref = isFullscreen ? fullscreenWebViewRef.current : embeddedWebViewRef.current
    if (!ref) return
    const payload = JSON.stringify(mapReports || [])
    ref.injectJavaScript(`
      if (window.updateMapMarkers) window.updateMapMarkers(${payload});
      true;
    `)
  }, [mapReports, isFullscreen])

  const syncUserLocation = useCallback(() => {
    if (!hasLocationAccess || !userLocation) return
    const payload = JSON.stringify({
      user: {
        latitude: userLocation.latitude,
        longitude: userLocation.longitude,
        heading: userHeading,
      },
    })
    const script = `
      if (window.updateUserLocation) window.updateUserLocation(${payload});
      true;
    `
    embeddedWebViewRef.current?.injectJavaScript(script)
    fullscreenWebViewRef.current?.injectJavaScript(script)
  }, [hasLocationAccess, userLocation, userHeading])

  useEffect(() => {
    if (mapLoading) return
    syncMapMarkers()
  }, [mapReports, mapLoading, syncMapMarkers])

  useEffect(() => {
    if (mapLoading) return
    syncUserLocation()
  }, [mapLoading, syncUserLocation])

  const handleMapMessage = useCallback((event) => {
    try {
      const data = JSON.parse(event.nativeEvent.data)
      if (data?.type === 'mapReady') {
        setMapLoading(false)
        syncMapMarkers()
        syncUserLocation()
        return
      }
      if (data?.type === 'openReport' && data?.id) {
        setIsFullscreen(false)
        router.push({ pathname: '/report_details', params: { id: data.id } })
      }
    } catch {
      // ignore malformed messages
    }
  }, [router, syncMapMarkers, syncUserLocation])

  const handleMapLoadStart = useCallback(() => {
    setMapLoading(true)
  }, [])

  const handleListLayout = useCallback((e) => {
    reportListScrollY.current = e.nativeEvent.layout.y
  }, [])

  const { refreshing, onRefresh, refreshControl } = usePullToRefresh(() => loadReports({ silent: true }))

  const mapPanelProps = {
    mapHtml,
    mapType,
    isFullscreen,
    showUnhealthy,
    showHealthy,
    showUserLocation: hasLocationAccess && !!userLocation,
    mapReports,
    legendBottom: 12,
    mapLoading,
    onMapTypeChange: setMapType,
    onOpenFullscreen: () => setIsFullscreen(true),
    onMapMessage: handleMapMessage,
    onMapLoadStart: handleMapLoadStart,
  }

  return {
    scrollRef,
    fadeAnim,
    slideAnim,
    isFullscreen,
    setIsFullscreen,
    activeFilter,
    setActiveFilter,
    showUnhealthy,
    showHealthy,
    setShowUnhealthy,
    setShowHealthy,
    filteredReports,
    isLoading,
    refreshing,
    onRefresh,
    refreshControl,
    embeddedWebViewRef,
    fullscreenWebViewRef,
    mapPanelProps,
    handleListLayout,
  }
}
