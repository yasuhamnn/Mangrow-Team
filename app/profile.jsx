import React, { useCallback, useEffect, useRef, useState } from 'react'
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, Animated, Alert, Image, ActivityIndicator } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import * as ImagePicker from 'expo-image-picker'
import { Ionicons, Feather } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import BottomNav from './components/BottomNav'
import { useBottomNavMetrics } from './utils/shared/screenLayout'
import { getUserProfile } from './utils/userService'
import { signOutUser } from './utils/authService'
import { getVolunteerProfileStats, uploadVolunteerAvatar } from './utils/profileBackend'
import { usePullToRefresh } from './utils/shared/usePullToRefresh'
import ScreenHeader, { HEADER_ICON_COLOR, HEADER_ICON_SIZE, HeaderIconButton, screenLayoutStyles } from './components/ScreenHeader'

export default function Profile() {
  const router = useRouter()
  const { scrollPadding } = useBottomNavMetrics()

  const fadeAnim = useRef(new Animated.Value(0)).current
  const slideAnim = useRef(new Animated.Value(10)).current

  const [userData, setUserData] = useState(null)
  const [userEmail, setUserEmail] = useState('')
  const [loading, setLoading] = useState(true)
  const [avatarUrl, setAvatarUrl] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [profileStats, setProfileStats] = useState({ reports: 0, resolutions: 0 })

  const loadProfile = useCallback(async () => {
    const profile = await getUserProfile()
    if (!profile) return

    setUserData(profile)
    setUserEmail(profile.email)
    setAvatarUrl(profile.avatar_url || null)

    const stats = await getVolunteerProfileStats()
    setProfileStats(stats)
  }, [])

  const { refreshControl } = usePullToRefresh(loadProfile)

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start()
  }, [])

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        await loadProfile()
      } catch (error) {
        console.error('Error fetching user data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchUserData()
  }, [loadProfile])

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.5,
      })

      if (!result.canceled) {
        uploadAvatar(result.assets[0].uri)
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to pick image.')
    }
  }

  const uploadAvatar = async (uri) => {
    try {
      setUploading(true)
      const cacheBusterUrl = await uploadVolunteerAvatar(uri)
      setAvatarUrl(cacheBusterUrl)
      setUserData(prev => prev ? { ...prev, avatar_url: cacheBusterUrl } : null)
    } catch (error) {
      Alert.alert('Upload Error', error.message || 'Network request failed')
    } finally {
      setUploading(false)
    }
  }

  const fullName = userData?.full_name || 'User'
  const role = (userData?.role || 'volunteer').toUpperCase()
  const avatarInitial = (fullName || 'U').charAt(0).toUpperCase()

  const handleSignOut = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to log out?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Logout', 
          style: 'destructive',
          onPress: async () => {
            try {
              await signOutUser()
              router.replace('/Sign_In')
            } catch (error) {
              Alert.alert('Error', 'Failed to log out.')
            }
          } 
        },
      ]
    )
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <Animated.View style={{ flex: 1, opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
        <ScreenHeader
          title="Profile"
          right={
            <HeaderIconButton onPress={handleSignOut}>
              <Ionicons name="log-out-outline" size={HEADER_ICON_SIZE} color={HEADER_ICON_COLOR} />
            </HeaderIconButton>
          }
        />

        <ScrollView
          style={screenLayoutStyles.scrollView}
          contentContainerStyle={[screenLayoutStyles.scrollContent, { paddingBottom: scrollPadding }]}
          refreshControl={refreshControl}
        >
        {/* Profile Card */}
        <View style={styles.profileCard}>
          <View style={styles.avatarContainer}>
            <TouchableOpacity style={[styles.avatar, { backgroundColor: 'rgb(239, 245, 232)' }]} onPress={pickImage} disabled={uploading}>
              {avatarUrl ? (
                <Image source={{ uri: avatarUrl }} style={styles.avatarImage} />
              ) : (
                <Text style={styles.avatarInitial}>{avatarInitial}</Text>
              )}
              {uploading && (
                <View style={styles.uploadOverlay}>
                  <ActivityIndicator color="rgb(255, 255, 255)" />
                </View>
              )}
            </TouchableOpacity>
            <TouchableOpacity style={styles.editAvatarBtn} onPress={pickImage}>
              <Ionicons name="camera" size={14} color="rgb(255, 255, 255)" />
            </TouchableOpacity>
          </View>
          
          <Text style={styles.userName}>{fullName}</Text>
          <Text style={styles.userRole}>{role}</Text>
          <View style={styles.emailBadge}>
            <Text style={styles.userEmail}>{userEmail}</Text>
          </View>
        </View>

        {/* Statistics Row (Nested in Profile or Separate) */}
        <View style={styles.section}>
          <View style={styles.statsRow}>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>{profileStats.reports}</Text>
              <Text style={styles.statLabel}>MY REPORTS</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>{profileStats.resolutions}</Text>
              <Text style={styles.statLabel}>MY RESOLUTION</Text>
            </View>
          </View>
        </View>

        {/* Settings Groups */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>ACCOUNT SETTINGS</Text>
          <View style={styles.settingsCard}>
            <SettingRow 
              icon="person-outline" 
              label="Edit Profile" 
              onPress={() => router.push('/edit_profile')}
            />
            <SettingRow 
              icon="lock-closed-outline" 
              label="Change Password" 
              onPress={() => router.push('/change_password')}
            />
            <SettingRow icon="shield-checkmark-outline" label="Privacy & Security" last />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>SUPPORT & APP</Text>
          <View style={styles.settingsCard}>
            <SettingRow icon="settings-outline" label="Preferences" />
            <SettingRow icon="help-circle-outline" label="About the Model" />
            <SettingRow icon="information-circle-outline" label="Help Center" last />
          </View>
        </View>

        <TouchableOpacity style={styles.logoutButton} onPress={handleSignOut}>
          <Text style={styles.logoutButtonText}>Logout</Text>
        </TouchableOpacity>

      </ScrollView>
      </Animated.View>

      <BottomNav activeTab="profile" />
    </SafeAreaView>
  )
}

const SettingRow = ({ icon, label, last, onPress }) => (
  <TouchableOpacity style={[styles.row, !last && styles.rowBorder]} onPress={onPress} activeOpacity={0.7}>
    <View style={styles.rowLeft}>
      <View style={styles.iconBox}>
        <Ionicons name={icon} size={18} color="rgb(52, 162, 50)" />
      </View>
      <Text style={styles.rowLabel}>{label}</Text>
    </View>
    <Ionicons name="chevron-forward" size={18} color="rgb(209, 213, 219)" />
  </TouchableOpacity>
)

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'rgb(251, 252, 247)' },

  profileCard: {
    backgroundColor: 'rgb(255, 255, 255)',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgb(232, 236, 221)',
    marginBottom: 24,
    shadowColor: 'rgb(167, 177, 149)',
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitial: { color: 'rgb(67, 113, 5)', fontFamily: 'Montserrat_700Bold', fontSize: 28 },
  avatarImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  editAvatarBtn: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: 'rgb(52, 162, 50)',
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 3,
    borderColor: 'rgb(255, 255, 255)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  uploadOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 40,
  },
  userName: {
    fontSize: 20,
    color: 'rgb(16, 32, 15)',
    fontFamily: 'Montserrat_700Bold',
  },
  userRole: {
    fontSize: 13,
    color: 'rgb(123, 129, 119)',
    fontFamily: 'Montserrat_500Medium',
    marginTop: 4,
  },
  emailBadge: {
    backgroundColor: 'rgb(239, 245, 232)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 10,
  },
  userEmail: {
    fontSize: 12,
    color: 'rgb(67, 113, 5)',
    fontFamily: 'Montserrat_600SemiBold',
  },
  section: {
    marginBottom: 20,
  },
  sectionLabel: {
    fontSize: 11,
    letterSpacing: 1,
    color: 'rgb(110, 117, 106)',
    fontFamily: 'Montserrat_700Bold',
    marginBottom: 8,
    marginLeft: 4,
  },
  statsRow: { flexDirection: 'row', gap: 12 },
  statBox: {
    flex: 1,
    backgroundColor: 'rgb(255, 255, 255)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgb(232, 236, 221)',
    paddingVertical: 12,
    alignItems: 'center',
  },
  statValue: { fontSize: 22, color: 'rgb(45, 160, 49)', fontFamily: 'Montserrat_700Bold', marginBottom: 2 },
  statLabel: { fontSize: 10, color: 'rgb(110, 117, 106)', fontFamily: 'Montserrat_600SemiBold' },

  settingsCard: {
    backgroundColor: 'rgb(255, 255, 255)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgb(232, 236, 221)',
    overflow: 'hidden',
  },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 14 },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: 'rgb(243, 245, 237)' },
  rowLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconBox: { width: 36, height: 36, borderRadius: 10, backgroundColor: 'rgb(247, 252, 242)', justifyContent: 'center', alignItems: 'center' },
  rowLabel: { fontSize: 14, color: 'rgb(16, 32, 15)', fontFamily: 'Montserrat_500Medium' },
  logoutButton: {
    backgroundColor: 'rgb(109, 170, 26)',
    padding: 15,
    borderRadius: 15,
    alignItems: 'center',
    marginTop: 2,
    marginHorizontal: 4,
  },
  logoutButtonText: {
    color: 'rgb(255, 255, 255)',
    fontSize: 16,
    fontFamily: 'Montserrat_700Bold',
  },
})