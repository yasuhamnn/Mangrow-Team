import { useMemo } from 'react'
import { useWindowDimensions } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

/** Fixed height of tab bar content above the home-indicator inset */
export const BOTTOM_NAV_CONTENT_HEIGHT = 60
export const BOTTOM_NAV_MIN_INSET = 12
/** Extra space so scroll content clears the floating tab bar */
export const BOTTOM_NAV_SCROLL_EXTRA = 16

const BASE_WIDTH = 390

/**
 * Scales UI values from a ~390pt reference width so layouts adapt across phones.
 */
export function useResponsiveLayout() {
  const { width, height } = useWindowDimensions()

  return useMemo(() => {
    const scale = Math.min(Math.max(width / BASE_WIDTH, 0.82), 1.18)
    const rs = (value) => Math.round(value * scale)
    const horizontalPadding = Math.max(12, Math.round(width * 0.037))
    const contentWidth = width - horizontalPadding * 2
    const isCompact = width < 360 || height < 640

    return {
      width,
      height,
      scale,
      rs,
      horizontalPadding,
      contentWidth,
      isCompact,
      heroCardWidth: contentWidth,
      heroMinHeight: Math.max(rs(118), Math.round(height * 0.14)),
    }
  }, [width, height])
}

/**
 * Safe-area metrics for screens with the volunteer/admin bottom tab bar.
 */
export function useBottomNavMetrics() {
  const insets = useSafeAreaInsets()
  const bottomInset = Math.max(insets.bottom, BOTTOM_NAV_MIN_INSET)
  const totalHeight = BOTTOM_NAV_CONTENT_HEIGHT + bottomInset
  const scrollPadding = totalHeight + BOTTOM_NAV_SCROLL_EXTRA

  return {
    insets,
    topInset: insets.top,
    bottomInset,
    leftInset: insets.left,
    rightInset: insets.right,
    totalHeight,
    scrollPadding,
    /** For floating controls inside a full-screen panel (e.g. map legend) */
    floatingBottom: bottomInset + 12,
  }
}

/** Alias for general screen adaptation */
export function useScreenInsets() {
  return useBottomNavMetrics()
}
