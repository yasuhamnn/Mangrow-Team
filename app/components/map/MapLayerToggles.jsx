import React from 'react'
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native'

export default function MapLayerToggles({
  showUnhealthy,
  showHealthy,
  onToggleUnhealthy,
  onToggleHealthy,
}) {
  return (
    <View style={styles.layerRow}>
      <Text style={styles.layerLabel}>Show on map:</Text>
      <TouchableOpacity
        style={[styles.layerChip, showUnhealthy && styles.layerChipActive]}
        onPress={onToggleUnhealthy}
        activeOpacity={0.85}
      >
        <View style={[styles.layerDot, { backgroundColor: 'rgb(255, 77, 79)' }]} />
        <Text style={[styles.layerChipText, showUnhealthy && styles.layerChipTextActive]}>
          Unhealthy
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.layerChip, showHealthy && styles.layerChipActive]}
        onPress={onToggleHealthy}
        activeOpacity={0.85}
      >
        <View style={[styles.layerDot, { backgroundColor: 'rgb(45, 160, 49)' }]} />
        <Text style={[styles.layerChipText, showHealthy && styles.layerChipTextActive]}>
          Healthy
        </Text>
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  layerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 4,
  },
  layerLabel: {
    fontSize: 12,
    fontFamily: 'Montserrat_600SemiBold',
    color: 'rgb(110, 117, 106)',
  },
  layerChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
    backgroundColor: 'rgb(244, 246, 241)',
    borderWidth: 1,
    borderColor: 'rgb(217, 222, 209)',
  },
  layerChipActive: {
    backgroundColor: 'rgb(239, 245, 232)',
    borderColor: 'rgb(61, 170, 43)',
  },
  layerDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  layerChipText: {
    fontSize: 11,
    fontFamily: 'Montserrat_600SemiBold',
    color: 'rgb(123, 129, 119)',
  },
  layerChipTextActive: {
    color: 'rgb(16, 32, 15)',
  },
})
