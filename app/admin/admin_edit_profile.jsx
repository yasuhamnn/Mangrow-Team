import React, { useState, useEffect } from 'react'
import { SafeAreaView } from 'react-native-safe-area-context'
import { StyleSheet, View, Text, TouchableOpacity, TextInput, ScrollView, Alert, ActivityIndicator } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import { getUserProfile, updateUserProfile } from '../utils/userService'
import LoadingOverlay from '../components/LoadingOverlay'

export default function AdminEditProfile() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
  })

  useEffect(() => {
    const fetchAdminData = async () => {
      try {
        const profile = await getUserProfile()
        if (profile) {
          setFormData({
            fullName: profile.full_name || '',
            email: profile.email || '',
          })
        }
      } catch (error) {
        console.error('Error fetching admin details:', error)
      } finally {
        setFetching(false)
      }
    }
    fetchAdminData()
  }, [])

  const handleUpdate = async () => {
    if (!formData.fullName.trim()) {
      Alert.alert('Error', 'Full name cannot be empty.')
      return
    }

    setLoading(true)
    try {
      await updateUserProfile({
        full_name: formData.fullName.trim(),
      })
      Alert.alert('Success', 'Profile updated successfully.')
      router.back()
    } catch (error) {
      console.error('Error updating profile:', error)
      Alert.alert('Error', 'Failed to update profile.')
    } finally {
      setLoading(false)
    }
  }

  if (fetching) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="rgb(52, 162, 50)" />
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.container}>
      <LoadingOverlay visible={loading} />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>Edit Profile</Text>
          <TouchableOpacity 
            style={styles.backButton} 
            onPress={() => router.back()}
            activeOpacity={0.8}
          >
            <Ionicons name="arrow-forward" size={18} color="rgb(16, 32, 15)" />
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>PERSONAL DETAILS</Text>
          <View style={styles.formCard}>
            <View style={styles.inputWrapper}>
              <Text style={styles.label}>Full Name</Text>
              <TextInput
                style={styles.input}
                value={formData.fullName}
                onChangeText={(text) => setFormData({ ...formData, fullName: text })}
                placeholder="Enter full name"
                placeholderTextColor="rgb(123, 129, 119)"
              />
            </View>

            <View style={[styles.inputWrapper, { borderBottomWidth: 0 }]}>
              <Text style={styles.label}>Email Address</Text>
              <Text style={styles.staticEmail}>{formData.email}</Text>
              <Text style={styles.hint}>Email cannot be changed for security reasons.</Text>
            </View>
          </View>
        </View>

        <TouchableOpacity 
          style={[styles.submitBtn, loading && styles.disabledBtn]} 
          onPress={handleUpdate}
          disabled={loading}
          activeOpacity={0.88}
        >
          {loading ? (
            <ActivityIndicator color="rgb(255, 255, 255)" />
          ) : (
            <Text style={styles.submitText}>Save Changes</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'rgb(251, 252, 247)' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    marginBottom: 16,
  },
  title: { fontSize: 22, color: 'rgb(16, 32, 15)', fontFamily: 'Montserrat_700Bold' },
  backButton: {
    width: 30,
    height: 30,
    borderRadius: 10,
    backgroundColor: 'rgb(239, 245, 232)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: { paddingHorizontal: 14, paddingTop: 18, paddingBottom: 40 },
  section: { marginBottom: 32 },
  sectionLabel: { fontSize: 11, letterSpacing: 1, color: 'rgb(110, 117, 106)', fontFamily: 'Montserrat_700Bold', marginBottom: 12, marginLeft: 4 },
  formCard: {
    backgroundColor: 'rgb(255, 255, 255)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgb(232, 236, 221)',
    paddingVertical: 8,
    paddingHorizontal: 16,
    overflow: 'hidden',
  },
  inputWrapper: {
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgb(243, 245, 237)',
  },
  label: { fontSize: 10, color: 'rgb(52, 162, 50)', fontFamily: 'Montserrat_700Bold', marginBottom: 8, textTransform: 'uppercase' },
  input: {
    fontSize: 14,
    fontFamily: 'Montserrat_500Medium',
    color: 'rgb(16, 32, 15)',
    padding: 0,
  },
  staticEmail: { fontSize: 14, fontFamily: 'Montserrat_500Medium', color: 'rgb(123, 129, 119)' },
  hint: { fontSize: 11, color: 'rgb(156, 163, 175)', marginTop: 6, fontFamily: 'Montserrat_400Regular', fontStyle: 'italic' },
  submitBtn: {
    backgroundColor: 'rgb(52, 162, 50)',
    paddingVertical: 16,
    borderRadius: 20,
    alignItems: 'center',
    marginTop: 10,
  },
  submitText: { color: 'rgb(255, 255, 255)', fontSize: 15, fontFamily: 'Montserrat_700Bold' },
  disabledBtn: { opacity: 0.7 }
})
