import React from 'react'
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'

export const SCREEN_BG = 'rgb(251, 252, 247)'
export const SCREEN_HEADER_BORDER = 'rgb(232, 236, 221)'
export const HEADER_ACTION_SIZE = 30
export const HEADER_ICON_SIZE = 18
export const HEADER_ACTION_RADIUS = 10
export const HEADER_ACTION_BG = 'rgb(239, 245, 232)'
export const HEADER_ICON_COLOR = 'rgb(16, 32, 15)'

export const screenLayoutStyles = StyleSheet.create({
  screenContainer: {
    flex: 1,
    backgroundColor: SCREEN_BG,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 14,
    paddingTop: 4,
    paddingBottom: 24,
  },
})

const actionStyles = StyleSheet.create({
  button: {
    width: HEADER_ACTION_SIZE,
    height: HEADER_ACTION_SIZE,
    borderRadius: HEADER_ACTION_RADIUS,
    backgroundColor: HEADER_ACTION_BG,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sideSlot: {
    width: HEADER_ACTION_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sideSpacer: {
    width: HEADER_ACTION_SIZE,
    height: HEADER_ACTION_SIZE,
  },
})

export function HeaderSideSpacer() {
  return <View style={actionStyles.sideSpacer} />
}

export function HeaderIconButton({ onPress, children, style, activeOpacity = 0.85 }) {
  return (
    <TouchableOpacity
      style={[actionStyles.button, style]}
      onPress={onPress}
      activeOpacity={activeOpacity}
      disabled={!onPress}
    >
      {children}
    </TouchableOpacity>
  )
}

export function HeaderBackButton({ onPress, icon = 'arrow-back' }) {
  return (
    <HeaderIconButton onPress={onPress}>
      <Ionicons name={icon} size={HEADER_ICON_SIZE} color={HEADER_ICON_COLOR} />
    </HeaderIconButton>
  )
}

export default function ScreenHeader({
  title,
  leading,
  right,
  subtitle,
  centered = false,
  style,
}) {
  if (centered) {
    return (
      <View style={[styles.header, style]}>
        <View style={actionStyles.sideSlot}>{leading || <HeaderSideSpacer />}</View>
        <Text style={styles.titleCenter} numberOfLines={1}>
          {title}
        </Text>
        <View style={actionStyles.sideSlot}>{right || <HeaderSideSpacer />}</View>
      </View>
    )
  }

  return (
    <View style={[styles.header, style]}>
      <View style={styles.leftCol}>
        <View style={styles.titleRow}>
          {leading}
          <Text style={[styles.title, leading ? styles.titleWithLeading : null]} numberOfLines={1}>
            {title}
          </Text>
        </View>
        {subtitle}
      </View>
      {right ? <View style={styles.rightCol}>{right}</View> : null}
    </View>
  )
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingTop: 18,
    paddingBottom: 12,
    backgroundColor: SCREEN_BG,
    borderBottomWidth: 1,
    borderBottomColor: SCREEN_HEADER_BORDER,
  },
  leftCol: {
    flex: 1,
    flexDirection: 'column',
    justifyContent: 'center',
    minWidth: 0,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minWidth: 0,
  },
  titleWithLeading: {
    flexShrink: 1,
  },
  rightCol: {
    marginLeft: 12,
    flexShrink: 0,
  },
  title: {
    fontSize: 22,
    fontFamily: 'Montserrat_700Bold',
    color: HEADER_ICON_COLOR,
    letterSpacing: -0.3,
  },
  titleCenter: {
    flex: 1,
    textAlign: 'center',
    fontSize: 18,
    fontFamily: 'Montserrat_700Bold',
    color: HEADER_ICON_COLOR,
    letterSpacing: -0.2,
  },
})
