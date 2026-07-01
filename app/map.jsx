import React from 'react'
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Animated,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Link } from 'expo-router'
import BottomNav from './components/BottomNav'
import { Feather } from '@expo/vector-icons'
import { useBottomNavMetrics } from './utils/shared/screenLayout'
import MapPanel from './components/map/MapPanel'
import MapFullscreenModal from './components/map/MapFullscreenModal'
import MapLayerToggles from './components/map/MapLayerToggles'
import MapReportList from './components/map/MapReportList'
import { useVolunteerMapScreen } from './components/map/useVolunteerMapScreen'

export default function MapScreen() {
  const { floatingBottom, scrollPadding } = useBottomNavMetrics()
  const {
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
    embeddedWebViewRef,
    fullscreenWebViewRef,
    mapPanelProps,
    handleListLayout,
  } = useVolunteerMapScreen()

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <Animated.ScrollView
        ref={scrollRef}
        style={{ flex: 1, opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}
        showsVerticalScrollIndicator={false}
        stickyHeaderIndices={[1]}
        scrollEventThrottle={16}
        scrollEnabled={!isFullscreen}
      >
        <View style={styles.topSection}>
          <View style={styles.header}>
            <Text style={styles.title}>Map</Text>
            <Link href="/search" asChild>
              <TouchableOpacity style={styles.searchBtn} activeOpacity={0.85}>
                <Feather name="search" size={18} color="rgb(48, 64, 24)" />
              </TouchableOpacity>
            </Link>
          </View>

          <MapPanel
            {...mapPanelProps}
            isFullscreen={false}
            webViewRef={embeddedWebViewRef}
          />

          <MapLayerToggles
            showUnhealthy={showUnhealthy}
            showHealthy={showHealthy}
            onToggleUnhealthy={() => setShowUnhealthy((v) => !v)}
            onToggleHealthy={() => setShowHealthy((v) => !v)}
          />
        </View>

        <MapReportList
          activeFilter={activeFilter}
          onFilterChange={setActiveFilter}
          filteredReports={filteredReports}
          isLoading={isLoading}
          scrollPadding={scrollPadding}
          onListLayout={handleListLayout}
        />
      </Animated.ScrollView>

      <MapFullscreenModal
        visible={isFullscreen}
        onClose={() => setIsFullscreen(false)}
        legendBottom={floatingBottom}
        mapPanelProps={mapPanelProps}
        webViewRef={fullscreenWebViewRef}
      />

      {!isFullscreen && <BottomNav activeTab="map" />}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'rgb(251, 252, 247)',
  },
  topSection: {
    paddingHorizontal: 14,
    paddingTop: 18,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  title: {
    fontSize: 22,
    fontFamily: 'Montserrat_700Bold',
    color: 'rgb(16, 32, 15)',
    letterSpacing: -0.3,
  },
  searchBtn: {
    width: 30,
    height: 30,
    borderRadius: 10,
    backgroundColor: 'rgb(239, 245, 232)',
    alignItems: 'center',
    justifyContent: 'center',
  },
})
