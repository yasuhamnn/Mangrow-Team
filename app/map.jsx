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
import ScreenHeader, { HEADER_ICON_SIZE, HeaderIconButton, screenLayoutStyles } from './components/ScreenHeader'

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
    refreshControl,
    embeddedWebViewRef,
    fullscreenWebViewRef,
    mapPanelProps,
    handleListLayout,
  } = useVolunteerMapScreen()

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <Animated.View style={{ flex: 1, opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
        <ScreenHeader
          title="Map"
          right={
            <Link href="/search" asChild>
              <HeaderIconButton>
                <Feather name="search" size={HEADER_ICON_SIZE} color="rgb(48, 64, 24)" />
              </HeaderIconButton>
            </Link>
          }
        />

        <Animated.ScrollView
          ref={scrollRef}
          style={screenLayoutStyles.scrollView}
          showsVerticalScrollIndicator={false}
          scrollEventThrottle={16}
          scrollEnabled={!isFullscreen}
          refreshControl={refreshControl}
        >
          <View style={styles.topSection}>
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
      </Animated.View>

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
    paddingTop: 4,
  },
})
