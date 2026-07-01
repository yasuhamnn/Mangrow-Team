import React, { useCallback, useEffect, useRef, useState } from 'react'

import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Animated,
  ActivityIndicator,
  Image,
} from 'react-native'

import { SafeAreaView } from 'react-native-safe-area-context'

import { Ionicons, Feather } from '@expo/vector-icons'

import { useRouter } from 'expo-router'

import { supabase } from '../supabaseClient'

import {
  searchMangroveData,
  searchReportsBySpeciesName,
  subscribeToSearchDataChanges,
} from './utils/searchBackend'

import { getStatusLabel } from './utils/shared/reportQuery'


export default function Search() {

  const router = useRouter()

  const [searchQuery, setSearchQuery] = useState('')

  const [loading, setLoading] = useState(false)

  const [results, setResults] = useState({ species: [], reports: [] })

  const [recentSearches, setRecentSearches] = useState([])

  const activeSpeciesRef = useRef(null)

  const fadeAnim = useRef(new Animated.Value(0)).current

  const slideAnim = useRef(new Animated.Value(10)).current


  useEffect(() => {

    Animated.parallel([

      Animated.timing(fadeAnim, { toValue: 1, duration: 250, useNativeDriver: true }),

      Animated.timing(slideAnim, { toValue: 0, duration: 250, useNativeDriver: true }),

    ]).start()

  }, [])


  const runSearch = useCallback(async (query, { silent = false, speciesOnly = null } = {}) => {

    const term = query?.trim()

    if (!term && !speciesOnly) {
      setResults({ species: [], reports: [] })
      activeSpeciesRef.current = null
      return
    }

    if (!silent) setLoading(true)
    try {
      if (speciesOnly) {
        const reports = await searchReportsBySpeciesName(speciesOnly)
        setResults({ species: [{ id: speciesOnly, name: speciesOnly }], reports })
      } else {
        const data = await searchMangroveData(term)
        setResults(data)
        activeSpeciesRef.current = null
        setRecentSearches((prev) => {
          const next = [term, ...prev.filter((item) => item !== term)]
          return next.slice(0, 5)

        })

      }

    } catch {

      setResults({ species: [], reports: [] })

    } finally {

      if (!silent) setLoading(false)

    }

  }, [])



  const onSpeciesPress = async (speciesName) => {

    setSearchQuery(speciesName)

    activeSpeciesRef.current = speciesName

    await runSearch(speciesName, { speciesOnly: speciesName })

  }



  useEffect(() => {

    const term = searchQuery.trim()

    if (!term) return undefined



    const refresh = () => {

      if (activeSpeciesRef.current) {

        runSearch(activeSpeciesRef.current, { silent: true, speciesOnly: activeSpeciesRef.current })

      } else {

        runSearch(term, { silent: true })

      }

    }


    const subscription = subscribeToSearchDataChanges(refresh, 'list')
    return () => {
      if (subscription) supabase.removeChannel(subscription)
    }
  }, [searchQuery, runSearch])


  const hasQuery = searchQuery.trim().length > 0

  return (
    <SafeAreaView style={styles.container}>
      <Animated.View style={[styles.main, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()} activeOpacity={0.7}>
            <Ionicons name="arrow-back" size={24} color="rgb(16, 32, 15)" />
          </TouchableOpacity>

          <View style={styles.searchBar}>
            <Feather name="search" size={18} color="rgb(123, 129, 119)" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search species or location..."
              placeholderTextColor="rgb(123, 129, 119)"
              value={searchQuery}
              onChangeText={(text) => {
                setSearchQuery(text)
                activeSpeciesRef.current = null
              }}

              onSubmitEditing={() => runSearch(searchQuery)}
              autoFocus
              returnKeyType="search"
            />

            {searchQuery.length > 0 && (

              <TouchableOpacity
                onPress={() => {
                  setSearchQuery('')
                  activeSpeciesRef.current = null
                  setResults({ species: [], reports: [] })
                }}

              >

                <Ionicons name="close-circle" size={20} color="rgb(123, 129, 119)" />
              </TouchableOpacity>

            )}

          </View>
        </View>

        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {loading && <ActivityIndicator size="small" color="rgb(109, 170, 26)" style={{ marginBottom: 16 }} />}

          {hasQuery && (
            <>
              {results.species.length > 0 && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Species</Text>
                  <View style={styles.listCard}>
                    {results.species.map((item) => (
                      <TouchableOpacity
                        key={item.id}
                        style={styles.listItem}
                        onPress={() => onSpeciesPress(item.name)}
                      >

                        <View style={styles.itemLeft}>
                          <Feather name="tag" size={16} color="rgb(52, 162, 50)" />
                          <Text style={styles.itemText}>{item.name}</Text>
                        </View>
                        <Feather name="arrow-up-left" size={18} color="rgb(209, 213, 219)" />
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}

              {results.reports.length > 0 && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Reports</Text>
                  {results.reports.map((report) => (
                    <TouchableOpacity
                      key={report.id}
                      style={styles.reportCard}
                      onPress={() => router.push({ pathname: '/report_details', params: { id: report.id } })}
                    >
                      <Image
                        source={report.image_url ? { uri: report.image_url } : require('../assets/mangroves_carousel_1.webp')}
                        style={styles.reportImage}
                      />

                      <View style={{ flex: 1 }}>
                        <Text style={styles.reportSpecies}>{report.species}</Text>
                        <Text style={styles.reportLocation}>{report.formatted_address || 'Unknown'}</Text>
                        <Text style={styles.reportStatus}>{getStatusLabel(report.status)}</Text>
                      </View>

                    </TouchableOpacity>

                  ))}
                </View>
              )}

              {!loading && results.species.length === 0 && results.reports.length === 0 && (
                <Text style={styles.emptyText}>No results found.</Text>
              )}
            </>
          )}

          {!hasQuery && recentSearches.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Recent Searches</Text>
                <TouchableOpacity onPress={() => setRecentSearches([])}>
                  <Text style={styles.clearText}>Clear All</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.listCard}>
                {recentSearches.map((item) => (
                  <TouchableOpacity
                    key={item}
                    style={styles.listItem}
                    onPress={() => {
                      setSearchQuery(item)
                      runSearch(item)
                    }}>

                    <View style={styles.itemLeft}>
                      <Feather name="clock" size={16} color="rgb(156, 163, 175)" />
                      <Text style={styles.itemText}>{item}</Text>
                    </View>
                    <Feather name="arrow-up-left" size={18} color="rgb(209, 213, 219)" />
                  </TouchableOpacity>
                ))}

              </View>
            </View>

          )}

        </ScrollView>
      </Animated.View>
    </SafeAreaView>

  )

}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: 'rgb(251, 252, 247)'
   },

  main: { 
    flex: 1 
  },

  header: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingHorizontal: 14, 
    paddingTop: 12, 
    paddingBottom: 16, 
    gap: 10 
  },

  backButton: { 
    width: 40, 
    height: 40, 
    borderRadius: 20, 
    justifyContent: 'center', 
    alignItems: 'center' 
  },

  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgb(255, 255, 255)',
    borderRadius: 15,
    paddingHorizontal: 12,
    height: 48,
    borderWidth: 1,
    borderColor: 'rgb(232, 236, 221)',
  },

  searchIcon: { 
    marginRight: 10 
  },

  searchInput: { 
    flex: 1, 
    fontSize: 15, 
    fontFamily: 'Montserrat_500Medium', 
    color: 'rgb(16, 32, 15)', 
    padding: 0 
  },

  content: { 
    paddingHorizontal: 14, 
    paddingBottom: 40 
  },

  section: { 
    marginBottom: 24 
  },

  sectionHeader: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    marginBottom: 14 
  },

  sectionTitle: { 
    fontSize: 11, 
    fontFamily: 'Montserrat_700Bold', 
    color: 'rgb(110, 117, 106)', 
    letterSpacing: 1, 
    textTransform: 'uppercase',
     marginLeft: 4, 
     marginBottom: 10 
    },

  clearText: { 
    fontSize: 12, 
    fontFamily: 'Montserrat_600SemiBold', 
    color: 'rgb(52, 162, 50)' 
  },

  listCard: { 
    backgroundColor: 'rgb(255, 255, 255)', 
    borderRadius: 20, 
    borderWidth: 1, 
    borderColor: 'rgb(232, 236, 221)', 
    overflow: 'hidden' 
  },

  listItem: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    padding: 16, 
    borderBottomWidth: 1, 
    borderBottomColor: 'rgb(243, 245, 237)' 
  },

  itemLeft: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 12 
  },

  itemText: { 
    fontSize: 15, 
    fontFamily: 'Montserrat_500Medium', 
    color: 'rgb(55, 65, 81)'
   },

  reportCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgb(255, 255, 255)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgb(232, 236, 221)',
    padding: 12,
    marginBottom: 10,
    gap: 12,
  },

  reportImage: { 
    width: 48, 
    height: 48, 
    borderRadius: 24 },

  reportSpecies: { 
    fontSize: 14, 
    fontFamily: 'Montserrat_700Bold', 
    color: 'rgb(16, 32, 15)' 
  },

  reportLocation: { 
    fontSize: 12, 
    fontFamily: 'Montserrat_400Regular', 
    color: 'rgb(123, 129, 119)', 
    marginTop: 2 
  },

  reportStatus: { 
    fontSize: 11, 
    fontFamily: 'Montserrat_600SemiBold', 
    color: 'rgb(52, 162, 50)', 
    marginTop: 4 
  },

  emptyText: { 
    textAlign: 'center', 
    color: 'rgb(156, 163, 175)', 
    fontFamily: 'Montserrat_400Regular', 
    marginTop: 20 
  },

})


