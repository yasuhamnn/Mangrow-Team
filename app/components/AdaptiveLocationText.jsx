import React from 'react'
import { Text, StyleSheet } from 'react-native'

export function getLocationFontSize(text = '') {
  const length = String(text).trim().length
  if (length <= 36) return 11
  if (length <= 52) return 10
  if (length <= 72) return 9
  return 8
}

export default function AdaptiveLocationText({
  text,
  style,
  numberOfLines = 2,
  color = 'rgb(123, 129, 119)',
}) {
  const value = text || 'Unknown location'
  const fontSize = getLocationFontSize(value)

  return (
    <Text
      style={[styles.base, { fontSize, color }, style]}
      numberOfLines={numberOfLines}
      adjustsFontSizeToFit
      minimumFontScale={0.75}
    >
      {value}
    </Text>
  )
}

const styles = StyleSheet.create({
  base: {
    flex: 1,
    fontFamily: 'Montserrat_400Regular',
    lineHeight: 14,
  },
})
