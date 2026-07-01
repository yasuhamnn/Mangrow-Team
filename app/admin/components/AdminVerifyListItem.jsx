import React from 'react'
import { StyleSheet, View, Text, TouchableOpacity, Image } from 'react-native'
import { Ionicons } from '@expo/vector-icons'

export default function AdminVerifyListItem({ item, onPress }) {
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.8}>
      <Image
        source={item.image_url ? { uri: item.image_url } : require('../../../assets/mangroves_carousel_1.webp')}
        style={styles.image}
      />
      <View style={styles.info}>
        <Text style={styles.species}>{item.species || 'Unknown'}</Text>
        <View style={styles.locationRow}>
          <Ionicons name="location-outline" size={12} color="rgb(123, 129, 119)" />
          <Text style={styles.location} numberOfLines={1}>
            {item.formatted_address || 'Unknown Location'}
          </Text>
        </View>
        <View style={styles.bottomRow}>
          <View style={styles.dateBadge}>
            <Ionicons name="calendar-outline" size={11} color="rgb(46, 143, 44)" />
            <Text style={styles.dateBadgeText}>
              {item.captured_at ? String(item.captured_at).slice(0, 10) : 'No date'}
            </Text>
          </View>
          {item.kind === 'resolution' ? (
            <View style={styles.resolutionBadge}>
              <Text style={styles.resolutionBadgeText}>Resolution</Text>
            </View>
          ) : (
            <View style={[
              styles.healthBadge,
              { backgroundColor: item.health_status === 'healthy' ? 'rgb(221, 243, 214)' : 'rgb(255, 231, 231)' },
            ]}>
              <Text style={[
                styles.healthBadgeText,
                { color: item.health_status === 'healthy' ? 'rgb(45, 160, 49)' : 'rgb(255, 77, 79)' },
              ]}>
                {item.health_status || 'unhealthy'}
              </Text>
            </View>
          )}
        </View>
      </View>
      <Ionicons name="chevron-forward" size={18} color="rgb(209, 213, 219)" />
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgb(255, 255, 255)',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgb(232, 236, 221)',
  },
  image: {
    width: 50,
    height: 50,
    borderRadius: 10,
    backgroundColor: 'rgb(243, 244, 246)',
  },
  info: { flex: 1, marginLeft: 12 },
  species: {
    fontSize: 15,
    fontFamily: 'Montserrat_700Bold',
    color: 'rgb(16, 32, 15)',
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
    gap: 4,
  },
  location: {
    fontSize: 12,
    color: 'rgb(107, 114, 128)',
    fontFamily: 'Montserrat_400Regular',
    flex: 1,
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    gap: 6,
  },
  dateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgb(207, 239, 199)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    gap: 4,
  },
  dateBadgeText: {
    fontSize: 10,
    color: 'rgb(46, 143, 44)',
    fontFamily: 'Montserrat_700Bold',
  },
  healthBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  healthBadgeText: {
    fontSize: 10,
    fontFamily: 'Montserrat_700Bold',
  },
  resolutionBadge: {
    backgroundColor: 'rgb(255, 242, 217)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  resolutionBadgeText: {
    fontSize: 10,
    fontFamily: 'Montserrat_700Bold',
    color: 'rgb(201, 138, 0)',
  },
})
