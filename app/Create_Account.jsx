import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  Dimensions,
} from 'react-native'
import React, { useState } from 'react'
import { Ionicons } from '@expo/vector-icons'
import { Link, useRouter } from 'expo-router'
import { registerUser } from './utils/authService'
import AuthBackground from './components/AuthBackground'
import LoadingOverlay from './components/LoadingOverlay'

const { width } = Dimensions.get('window')

const Create_Account = () => {
  const [showPassword, setShowPassword] = useState(false)
  const [fullNameFocused, setFullNameFocused] = useState(false)
  const [emailFocused, setEmailFocused] = useState(false)
  const [passwordFocused, setPasswordFocused] = useState(false)
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const handleCreateAccount = async () => {
    setErrorMessage('')

    if (!fullName.trim() || !email.trim() || !password) {
      setErrorMessage('Please fill in all fields.')
      return
    }

    if (password.length < 6) {
      setErrorMessage('Password must be at least 6 characters.')
      return
    }

    setIsLoading(true)

    try {
      await registerUser(fullName.trim(), email.trim(), password)
      router.replace('/dashboard')
    } catch (error) {
      setErrorMessage(error.message || 'Unable to create account.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <AuthBackground style={styles.container}>
      <LoadingOverlay visible={isLoading} />
      <Text style={styles.title}>Welcome to Mangrow</Text>
      <Text style={styles.subtitle}>Monitor mangroves, protect coastlines</Text>

      <View style={styles.card}>
        <View style={styles.tabContainer}>
          <Link href="/Sign_In" asChild>
            <TouchableOpacity style={styles.inactiveTab} delayPressIn={0}>
              <Text style={styles.inactiveText}>Sign In</Text>
            </TouchableOpacity>
          </Link>
          <TouchableOpacity style={styles.activeTab} delayPressIn={0}>
            <Text style={styles.activeText}>Create Account</Text>
          </TouchableOpacity>
        </View>

        {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}

        <Text style={styles.label}>Full Name</Text>
        <TextInput
          placeholder="Your full name"
          style={[styles.input, fullNameFocused && styles.inputFocused]}
          placeholderTextColor="rgb(122, 133, 147)"
          onFocus={() => setFullNameFocused(true)}
          onBlur={() => setFullNameFocused(false)}
          onChangeText={setFullName}
          value={fullName}
        />

        <Text style={styles.label}>Email Address</Text>
        <TextInput
          placeholder="you@example.com"
          style={[styles.input, emailFocused && styles.inputFocused]}
          keyboardType="email-address"
          autoCapitalize="none"
          placeholderTextColor="rgb(122, 133, 147)"
          onFocus={() => setEmailFocused(true)}
          onBlur={() => setEmailFocused(false)}
          onChangeText={setEmail}
          value={email}
        />

        <Text style={styles.label}>Password</Text>
        <View style={[styles.passwordContainer, passwordFocused && styles.inputFocused]}>
          <TextInput
            placeholder="Min. 6 characters"
            style={styles.passwordInput}
            secureTextEntry={!showPassword}
            placeholderTextColor="rgb(122, 133, 147)"
            onFocus={() => setPasswordFocused(true)}
            onBlur={() => setPasswordFocused(false)}
            onChangeText={setPassword}
            value={password}
          />
          <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
            <Ionicons name={showPassword ? 'eye-outline' : 'eye-off-outline'} size={22} color="rgb(107, 114, 128)" />
          </TouchableOpacity>
        </View>

        <View style={styles.bottomPrompt}>
          <Text style={styles.bottomPromptText}>Already have an account? </Text>
          <Link href="/Sign_In" asChild>
            <TouchableOpacity delayPressIn={0}><Text style={styles.bottomPromptLink}>Sign In</Text></TouchableOpacity>
          </Link>
        </View>

        <TouchableOpacity style={styles.button} onPress={handleCreateAccount} delayPressIn={0}>
          <Text style={styles.buttonText}>Create Account →</Text>
        </TouchableOpacity>
      </View>
    </AuthBackground>
  )
}

export default Create_Account

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', paddingTop: 150, backgroundColor: 'rgba(255, 255, 255, 0.69)' },
  title: { fontSize: width * 0.06, fontFamily: 'Montserrat_700Bold', color: 'rgb(17, 24, 39)', textAlign: 'center' },
  subtitle: { fontSize: width * 0.035, color: 'rgb(107, 114, 128)', marginBottom: 10, textAlign: 'center' },
  card: { borderRadius: 20, padding: 20, paddingBottom: 28, width: '90%' },
  tabContainer: { flexDirection: 'row', backgroundColor: 'rgb(243, 244, 246)', borderRadius: 14, padding: 4, marginBottom: 20 },
  activeTab: { flex: 1, backgroundColor: 'rgb(255, 255, 255)', paddingVertical: 10, borderRadius: 12, alignItems: 'center' },
  inactiveTab: { flex: 1, paddingVertical: 10, alignItems: 'center' },
  activeText: { fontFamily: 'Montserrat_700Bold', color: 'rgb(17, 24, 39)' },
  inactiveText: { color: 'rgb(107, 114, 128)', fontFamily: 'Montserrat_600SemiBold' },
  label: { marginTop: 10, marginBottom: 5, fontSize: 14, color: 'rgb(55, 65, 81)', fontFamily: 'Montserrat_600SemiBold' },
  input: { borderWidth: 1, borderColor: 'rgb(209, 213, 219)', borderRadius: 12, padding: 12, marginBottom: 10, backgroundColor: 'rgb(249, 250, 251)' },
  inputFocused: { borderColor: 'rgb(109, 170, 26)' },
  passwordContainer: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: 'rgb(209, 213, 219)', borderRadius: 12, paddingHorizontal: 12, backgroundColor: 'rgb(249, 250, 251)', marginBottom: 10 },
  passwordInput: { flex: 1, paddingVertical: 12 },
  bottomPrompt: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 24 },
  bottomPromptText: { color: 'rgb(55, 65, 81)', fontSize: 14 },
  bottomPromptLink: { color: 'rgb(67, 113, 5)', fontSize: 14, fontWeight: '700' },
  button: { backgroundColor: 'rgb(109, 170, 26)', padding: 15, borderRadius: 15, alignItems: 'center', marginTop: 20 },
  errorText: { color: 'rgb(185, 28, 28)', fontSize: 14, fontWeight: '600', textAlign: 'center', marginTop: 12 },
  buttonText: { color: 'rgb(255, 255, 255)', fontSize: 16, fontFamily: 'Montserrat_700Bold' },
})
