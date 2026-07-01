import React, { useState, useEffect } from 'react'
import { StyleSheet, Text, View, Image, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import {
  useFonts,
  Montserrat_400Regular,
  Montserrat_600SemiBold,
  Montserrat_700Bold,
} from '@expo-google-fonts/montserrat'

export default function SpeciesWithGpsCoordinatesResult() {
  const router = useRouter()
  const params = useLocalSearchParams()
  const insets = useSafeAreaInsets()

  const [fontsLoaded] = useFonts({
    Montserrat_400Regular,
    Montserrat_600SemiBold,
    Montserrat_700Bold,
  })

  if (!fontsLoaded) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="rgb(109, 170, 26)" />
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.titleText}>Mangrove Detection Result</Text>

        {/* Captured Image */}
        <View style={styles.imageCard}>
          {params.imageUri ? (
            <Image source={{ uri: params.imageUri }} style={styles.image} />
          ) : (
            <View style={styles.imagePlaceholder}>
              <Ionicons name="image-outline" size={50} color="rgb(156, 163, 175)" />
            </View>
          )}
        </View>

        {/* Species Info */}
        <View style={styles.card}>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>AI SPECIES IDENTIFICATION</Text>
          </View>

          <Text style={styles.speciesName}>{params.speciesName || 'Rhizophora Apiculata'}</Text>

          <Text style={styles.description}>{params.description || 'Description'}</Text>

          <Text style={styles.disclaimer}>
            Species identification will appear here once the AI model is implemented.
          </Text>
        </View>
      </ScrollView>

      {/* Fixed Action Button Dock */}
      <View style={[styles.buttonDock, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={() => router.push({
            pathname: '/health_camera',
            params: params,
          })}
        >
          <Ionicons name="heart-circle-outline" size={22} color="rgb(255, 255, 255)" />
          <Text style={styles.primaryButtonText}>Check Health Status</Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'rgb(251, 252, 247)'
  },

  content: {
    padding: 16,
    paddingBottom: 30,
    paddingTop: 80,
  },

  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgb(251, 252, 247)',
  },

  titleText: {
    fontSize: 20,
    fontFamily: 'Montserrat_700Bold',
    color: 'rgb(16, 32, 15)',
    marginBottom: 20,
    textAlign: 'center',
  },

  label: {
    marginTop: 15,
    fontWeight: 'bold',
  },

  imageCard: {
    borderRadius: 22,
    overflow: 'hidden',
    backgroundColor: 'rgb(255, 255, 255)',
    marginBottom: 16
  },

  image: {
    width: '100%',
    height: 260
  },

  imagePlaceholder: {
    height: 260,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgb(243, 244, 246)'
  },

  card: {
    backgroundColor: 'rgb(255, 255, 255)',
    borderRadius: 20,
    padding: 18,
    marginBottom: 16
  },

  badge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgb(207, 239, 199)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    marginBottom: 12
  },

  badgeText: {
    fontSize: 11,
    color: 'rgb(46, 143, 44)',
    fontFamily: 'Montserrat_700Bold'
  },

  speciesName: {
    fontSize: 25,
    lineHeight: 38,
    color: 'rgb(16, 32, 15)',
    fontFamily: 'Montserrat_700Bold',
    marginBottom: 10
  },

  description: {
    fontSize: 16,
    lineHeight: 28,
    color: 'rgb(75, 85, 99)',
    fontFamily: 'Montserrat_400Regular'
  },

  disclaimer: {
    marginTop: 20,
    fontSize: 13,
    lineHeight: 20,
    color: 'rgb(156, 163, 175)',
    fontStyle: 'italic'
  },

  locationCard: {
    backgroundColor: 'rgb(255, 255, 255)',
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgb(232, 236, 221)',
    shadowColor: 'rgb(167, 177, 149)',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 1,
  },

  locationHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },

  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgb(240, 249, 232)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },

  locationTextColumn: {
    flex: 1,
  },

  locationLabel: {
    fontSize: 10,
    fontFamily: 'Montserrat_700Bold',
    color: 'rgb(109, 170, 26)',
    letterSpacing: 1,
    marginBottom: 2,
  },

  locationTitle: {
    fontSize: 13,
    color: 'rgb(16, 32, 15)',
    fontFamily: 'Montserrat_600SemiBold'
  },

  locationSub: {
    fontSize: 12,
    color: 'rgb(107, 114, 128)',
    fontFamily: 'Montserrat_400Regular'
  },

  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    gap: 12,
  },

  textContainer: {
    flex: 1,
  },

  miniLabel: {
    fontSize: 9,
    fontFamily: 'Montserrat_700Bold',
    color: 'rgb(156, 163, 175)',
    letterSpacing: 0.5,
    marginBottom: 1,
  },

  infoText: {
    fontSize: 12,
    lineHeight: 16,
    color: 'rgb(75, 85, 99)',
    fontFamily: 'Montserrat_400Regular'
  },

  divider: {
    height: 1,
    backgroundColor: 'rgb(229, 231, 235)',
    marginVertical: 14
  },

  detailsGrid: {
    gap: 12,
    marginTop: 4,
  },

  detailItem: {
    marginBottom: 4,
  },

  buttonDock: {
    padding: 16,
    backgroundColor: 'rgb(255, 255, 255)',
    borderTopWidth: 1,
    borderTopColor: 'rgb(229, 231, 235)',
  },

  primaryButton: {
    height: 60,
    borderRadius: 16,
    backgroundColor: 'rgb(109, 170, 26)',
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row'
  },

  primaryButtonText: {
    marginLeft: 8,
    color: 'rgb(255, 255, 255)',
    fontSize: 14,
    fontFamily: 'Montserrat_700Bold'
  },
})