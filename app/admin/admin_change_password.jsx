import React, { useState } from 'react'
import { SafeAreaView } from 'react-native-safe-area-context'
import { StyleSheet, View, Text, TouchableOpacity, TextInput, ScrollView, Alert, ActivityIndicator } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import { updateUserPassword } from '../utils/passwordService'
import LoadingOverlay from '../components/LoadingOverlay'

export default function AdminChangePassword() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [formData, setFormData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  })

  const handleUpdate = async () => {
    const { currentPassword, newPassword, confirmPassword } = formData;

    if (!currentPassword || !newPassword || !confirmPassword) {
      Alert.alert('Error', 'Please fill in all fields.');
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert('Error', 'New passwords do not match.');
      return;
    }

    if (newPassword.length < 6) {
      Alert.alert('Error', 'New password must be at least 6 characters.');
      return;
    }

    setLoading(true);
    try {
      await updateUserPassword(currentPassword, newPassword);

      Alert.alert('Success', 'Password updated successfully.');
      router.back();
    } catch (error) {
      console.error('Error updating password:', error);
      if (error.message?.includes('Invalid login credentials')) {
        Alert.alert('Error', 'Incorrect current password.');
      } else {
        Alert.alert('Error', 'Failed to update password. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <LoadingOverlay visible={loading} />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>Change Password</Text>
          <TouchableOpacity 
            style={styles.backButton} 
            onPress={() => router.back()}
            activeOpacity={0.8}
          >
            <Ionicons name="arrow-forward" size={20} color="rgb(16, 32, 15)" />
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>SECURITY CREDENTIALS</Text>
          <View style={styles.formCard}>
            <View style={styles.inputWrapper}>
              <Text style={styles.label}>Current Password</Text>
              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.input}
                  value={formData.currentPassword}
                  onChangeText={(text) => setFormData({ ...formData, currentPassword: text })}
                  placeholder="Required to verify identity"
                  placeholderTextColor="rgb(156, 163, 175)"
                  secureTextEntry={!showCurrent}
                />
                <TouchableOpacity onPress={() => setShowCurrent(!showCurrent)} style={styles.eyeIcon}>
                  <Ionicons name={showCurrent ? "eye-off-outline" : "eye-outline"} size={18} color="rgb(123, 129, 119)" />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.inputWrapper}>
              <Text style={styles.label}>New Password</Text>
              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.input}
                  value={formData.newPassword}
                  onChangeText={(text) => setFormData({ ...formData, newPassword: text })}
                  placeholder="Min. 6 characters"
                  placeholderTextColor="rgb(156, 163, 175)"
                  secureTextEntry={!showNew}
                />
                <TouchableOpacity onPress={() => setShowNew(!showNew)} style={styles.eyeIcon}>
                  <Ionicons name={showNew ? "eye-off-outline" : "eye-outline"} size={18} color="rgb(123, 129, 119)" />
                </TouchableOpacity>
              </View>
            </View>

            <View style={[styles.inputWrapper, { borderBottomWidth: 0 }]}>
              <Text style={styles.label}>Confirm New Password</Text>
              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.input}
                  value={formData.confirmPassword}
                  onChangeText={(text) => setFormData({ ...formData, confirmPassword: text })}
                  placeholder="Repeat new password"
                  placeholderTextColor="rgb(156, 163, 175)"
                  secureTextEntry={!showConfirm}
                />
                <TouchableOpacity onPress={() => setShowConfirm(!showConfirm)} style={styles.eyeIcon}>
                  <Ionicons name={showConfirm ? "eye-off-outline" : "eye-outline"} size={18} color="rgb(123, 129, 119)" />
                </TouchableOpacity>
              </View>
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
            <Text style={styles.submitText}>Update Password</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'rgb(251, 252, 247)' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 16, marginBottom: 16 },
  title: { fontSize: 22, color: 'rgb(16, 32, 15)', fontFamily: 'Montserrat_700Bold' },
  backButton: { width: 38, height: 38, borderRadius: 15, backgroundColor: 'rgb(239, 245, 232)', justifyContent: 'center', alignItems: 'center' },
  content: { paddingHorizontal: 14, paddingTop: 18, paddingBottom: 60 },
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
  inputContainer: { position: 'relative', justifyContent: 'center' },
  input: { fontSize: 14, fontFamily: 'Montserrat_500Medium', color: 'rgb(16, 32, 15)', paddingRight: 40, paddingVertical: 0 },
  eyeIcon: { position: 'absolute', right: 0 },
  submitBtn: { backgroundColor: 'rgb(52, 162, 50)', paddingVertical: 16, borderRadius: 20, alignItems: 'center', marginTop: 10 },
  submitText: { color: 'rgb(255, 255, 255)', fontSize: 15, fontFamily: 'Montserrat_700Bold' },
  disabledBtn: { opacity: 0.7 }
})
