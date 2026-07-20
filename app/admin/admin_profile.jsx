import React, { useCallback, useEffect, useRef, useState } from 'react'
import { SafeAreaView } from 'react-native-safe-area-context'
import { StyleSheet, View, Text, TouchableOpacity, Image, ScrollView, Alert, Animated, ActivityIndicator } from 'react-native'
import { Ionicons, Feather } from '@expo/vector-icons'
import * as ImagePicker from 'expo-image-picker'
import { useRouter } from 'expo-router'
import AdminBottomNav from './AdminBottomNav'
import { useBottomNavMetrics } from '../utils/shared/screenLayout'
import {
  getAdminProfile,
  getAdminProfileStats,
  uploadAdminAvatar,
  signOutAdmin,
} from '../utils/adminProfileBackend'
import { usePullToRefresh } from '../utils/shared/usePullToRefresh'
import ScreenHeader, { HEADER_ICON_COLOR, HEADER_ICON_SIZE, HeaderIconButton, screenLayoutStyles } from '../components/ScreenHeader'

export default function AdminProfile() {
  const router = useRouter()
  const { scrollPadding } = useBottomNavMetrics();
  const fadeAnim = useRef(new Animated.Value(0)).current
  const slideAnim = useRef(new Animated.Value(10)).current

  const [adminData, setAdminData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [avatarUrl, setAvatarUrl] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [profileStats, setProfileStats] = useState({ pending: 0, verified: 0 })

  const loadAdminProfile = useCallback(async () => {
    const profile = await getAdminProfile()
    if (!profile) return

    setAdminData(profile)
    setAvatarUrl(profile.avatar_url || null)

    const stats = await getAdminProfileStats()
    setProfileStats(stats)
  }, [])

  const { refreshControl } = usePullToRefresh(loadAdminProfile)

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
    const fetchAdminData = async () => {
      try {
        setLoading(true)
        await loadAdminProfile()
      } catch (error) {
        console.error('Error fetching admin details:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchAdminData()
  }, [loadAdminProfile])

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.5,
      })

      if (!result.canceled) {
        handleUploadAvatar(result.assets[0].uri)
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to pick image.')
    }
  }

  const handleUploadAvatar = async (uri) => {
    try {
      setUploading(true)
      const newUrl = await uploadAdminAvatar(uri)
      setAvatarUrl(newUrl)
      setAdminData(prev => prev ? { ...prev, avatar_url: newUrl } : null)
    } catch (error) {
      Alert.alert('Upload Error', error.message || 'Failed to upload photo.')
    } finally {
      setUploading(false)
    }
  }

  const handleLogout = () => {
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
              await signOutAdmin()
              router.replace('/Sign_In')
            } catch (error) {
              Alert.alert('Error', 'Failed to log out.')
            }
          } 
        },
      ]
    )
  }

  const fullName = adminData?.full_name || 'Admin'
  const email = adminData?.email || ''

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <Animated.View style={{ flex: 1, opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
        <ScreenHeader
          title="Profile"
          right={
            <HeaderIconButton onPress={handleLogout}>
              <Ionicons name="log-out-outline" size={HEADER_ICON_SIZE} color={HEADER_ICON_COLOR} />
            </HeaderIconButton>
          }
        />

        <ScrollView
          style={screenLayoutStyles.scrollView}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[screenLayoutStyles.scrollContent, { paddingBottom: scrollPadding }]}
          refreshControl={refreshControl}
        >
        {/* Profile Card */}
        <View style={styles.profileCard}>
          <View style={styles.avatarContainer}>
            <TouchableOpacity 
              style={[styles.avatar, { backgroundColor: 'rgb(239, 245, 232)' }]} 
              onPress={pickImage} 
              disabled={uploading}
            >
              {avatarUrl ? (
                <Image source={{ uri: avatarUrl }} style={styles.avatarImage} />
              ) : (
                <Image source={require('../../assets/mangroves_carousel_1.webp')} style={styles.avatarImage} />
              )}
              {uploading && (
                <View style={styles.uploadOverlay}>
                  <ActivityIndicator color="rgb(255, 255, 255)" />
                </View>
              )}
            </TouchableOpacity>
            <TouchableOpacity style={styles.editAvatarBtn} onPress={pickImage}>
              <Ionicons name="camera" size={16} color="rgb(255, 255, 255)" />
            </TouchableOpacity>
          </View>
          
          <Text style={styles.adminName}>{fullName}</Text>
          <Text style={styles.adminRole}>Administrator</Text>
          <View style={styles.emailBadge}>
            <Text style={styles.adminEmail}>{email}</Text>
          </View>
        </View>

        {/* Statistics Row */}
        <View style={styles.section}>
          <View style={styles.statsRow}>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>{profileStats.pending}</Text>
              <Text style={styles.statLabel}>PENDING</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>{profileStats.verified}</Text>
              <Text style={styles.statLabel}>VERIFIED</Text>
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
              onPress={() => router.push('/admin/admin_edit_profile')}
            />
            <SettingRow 
              icon="lock-closed-outline" 
              label="Change Password" 
              onPress={() => router.push('/admin/admin_change_password')}
            />
            <SettingRow icon="shield-checkmark-outline" label="Privacy & Security" last />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>SUPPORT & APP</Text>
          <View style={styles.settingsCard}>
            <SettingRow icon="help-buoy-outline" label="Help Center" />
            <SettingRow icon="chatbox-ellipses-outline" label="Feedback" />
            <SettingRow icon="information-circle-outline" label="About Mangrow" last />
          </View>
        </View>
      </ScrollView>
      </Animated.View>

      <AdminBottomNav activeTab="profile" />
    </SafeAreaView>
  )
}

const SettingRow = ({ icon, label, last, onPress }) => (
  <TouchableOpacity style={[styles.row, !last && styles.rowBorder]} onPress={onPress} activeOpacity={0.7}>
    <View style={styles.rowLeft}>
      <View style={styles.iconBox}>
        <Ionicons name={icon} size={20} color="rgb(52, 162, 50)" />
      </View>
      <Text style={styles.rowLabel}>{label}</Text>
    </View>
    <Ionicons name="chevron-forward" size={18} color="rgb(209, 213, 219)" />
  </TouchableOpacity>
)

const styles = StyleSheet.create({
  container:{
    flex: 1,
    backgroundColor: 'rgb(251, 252, 247)',
  },
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
    width: 90,
    height: 90,
    borderRadius: 45,
    overflow: 'hidden',
  },
  avatarImage: {
    width: 90,
    height: 90,
  },
  editAvatarBtn: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: 'rgb(52, 162, 50)',
    width: 30,
    height: 30,
    borderRadius: 15,
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
    borderRadius: 45,
  },
  adminName: {
    fontSize: 20,
    color: 'rgb(16, 32, 15)',
    fontFamily: 'Montserrat_700Bold',
  },
  adminRole: {
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
  adminEmail: {
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
  statsRow: { 
    flexDirection: 'row', 
    gap: 12 
  },
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
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgb(232, 236, 221)',
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
  },
  rowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgb(243, 245, 237)',
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgb(247, 252, 242)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  rowLabel: {
    fontSize: 14,
    color: 'rgb(16, 32, 15)',
    fontFamily: 'Montserrat_500Medium',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: 'rgb(255, 231, 231)',
    paddingVertical: 14,
    borderRadius: 18,
    marginTop: 10,
    borderWidth: 1,
    borderColor: 'rgb(255, 209, 209)',
  },
  logoutText: {
    fontSize: 15,
    color: 'rgb(255, 59, 48)',
    fontFamily: 'Montserrat_700Bold',
  },
})