import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  Dimensions,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
} from 'react-native'
import React, { useCallback, useRef, useState } from 'react'
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

  const scrollRef = useRef(null)
  const fullNameRef = useRef(null)
  const emailRef = useRef(null)
  const passwordRef = useRef(null)
  const fieldOffsets = useRef({})

  const scrollToField = useCallback((key) => {
    const y = fieldOffsets.current[key]
    if (y == null) return
    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({ y: Math.max(0, y - 12), animated: true })
    })
  }, [])

  const registerFieldOffset = useCallback((key, y) => {
    fieldOffsets.current[key] = y
  }, [])

  const handleCreateAccount = async () => {
    if (isLoading) return
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

      {/* Fixed area: title, subtitle, and tabs never move with the keyboard */}
      <View style={styles.fixedTop}>
        <Text style={styles.title}>Welcome to Mangrow</Text>
        <Text style={styles.subtitle}>Monitor mangroves, protect coastlines</Text>
        
{/* sign in and create account sa taas */}
        <View style={styles.tabContainer}>
{/* Para mo adto sa Sign in ig click  */}
          <Link href="/Sign_In" asChild>
            <TouchableOpacity style={styles.inactiveTab} delayPressIn={0}>
              <Text style={styles.inactiveText}>Sign In</Text>
            </TouchableOpacity>
          </Link>
          <TouchableOpacity style={styles.activeTab} delayPressIn={0}>
            <Text style={styles.activeText}>Create Account</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Only this form area adjusts when the keyboard opens */}
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.card}>
            {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}

            <View onLayout={(e) => registerFieldOffset('fullName', e.nativeEvent.layout.y)}>
              <Text style={styles.label}>Full Name</Text>
              <TextInput
                ref={fullNameRef}
                placeholder="Your full name"
                style={[styles.input, fullNameFocused && styles.inputFocused]}  
                autoCapitalize="words"
                autoComplete="name"
                textContentType="name"
                returnKeyType="next"
                blurOnSubmit={false}
                editable={!isLoading}
                placeholderTextColor="rgb(122, 133, 147)"
                onFocus={() => {
                  setFullNameFocused(true)
                  scrollToField('fullName')
                }}
                onBlur={() => setFullNameFocused(false)}
                onChangeText={setFullName}
                value={fullName}
                onSubmitEditing={() => emailRef.current?.focus()}
              />
            </View>

            <View onLayout={(e) => registerFieldOffset('email', e.nativeEvent.layout.y)}>
              <Text style={styles.label}>Email Address</Text>
              <TextInput
                ref={emailRef}
                placeholder="you@example.com"
                style={[styles.input, emailFocused && styles.inputFocused]}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                textContentType="emailAddress"
                returnKeyType="next"
                blurOnSubmit={false}
                editable={!isLoading}
                placeholderTextColor="rgb(122, 133, 147)"
                onFocus={() => {
                  setEmailFocused(true)
                  scrollToField('email')
                }}
                onBlur={() => setEmailFocused(false)}
                onChangeText={setEmail}
                value={email}
                onSubmitEditing={() => passwordRef.current?.focus()}
              />
            </View>

            <View onLayout={(e) => registerFieldOffset('password', e.nativeEvent.layout.y)}>
              <Text style={styles.label}>Password</Text>
              <View style={[styles.passwordContainer, passwordFocused && styles.inputFocused]}>
                <TextInput
                  ref={passwordRef}
                  placeholder="Min. 6 characters"
                  style={styles.passwordInput}

// comment if ig input sa password kay makita ang gi input
                  secureTextEntry={!showPassword}
                  
                  autoComplete="password-new"
                  textContentType="newPassword"
                  returnKeyType="go"
                  editable={!isLoading}
                  placeholderTextColor="rgb(122, 133, 147)"
                  onFocus={() => {
                    setPasswordFocused(true)
                    scrollToField('password')
                  }}
                  onBlur={() => setPasswordFocused(false)}
                  onChangeText={setPassword}
                  value={password}
                  onSubmitEditing={handleCreateAccount}
                />
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
{/* eh reverse ang icon sa eye if */}
                  <Ionicons name={showPassword ? 'eye-outline' : 'eye-off-outline'} size={20} color="rgb(107, 114, 128)" />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.bottomPrompt}>
              <Text style={styles.bottomPromptText}>Already have an account? </Text>
              <Link href="/Sign_In" asChild>
                <TouchableOpacity delayPressIn={0}><Text style={styles.bottomPromptLink}>Sign In</Text></TouchableOpacity>
              </Link>
            </View>

            <TouchableOpacity style={styles.button} onPress={handleCreateAccount} delayPressIn={0} disabled={isLoading}>
              <Text style={styles.buttonText}>Create Account →</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </AuthBackground>
  )
}

export default Create_Account

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'rgba(255, 255, 255, 0.69)' },
  flex: { flex: 1 },
  fixedTop: {
    alignItems: 'center',
    paddingTop: 110,
    paddingHorizontal: 28,
    paddingBottom: 4,
  },
  title: { // Welcome to Mangrove
    fontSize: width * 0.055,
    fontFamily: 'Montserrat_700Bold',
    color: 'rgb(17, 24, 39)',
    textAlign: 'center', 
  },
  subtitle: { // Monitor mangroves, protect coastlines
    fontSize: width * 0.032,
    color: 'rgb(107, 114, 128)',
    marginTop: 2,
    marginBottom: 14,
    textAlign: 'center',
  },
  tabContainer: { // container sa tass na sign in and create account
    flexDirection: 'row',
    backgroundColor: 'rgb(243, 244, 246)',
    borderRadius: 14,
    padding: 4,
    width: '100%',
    maxWidth: 400,
  },
  activeTab: {
    flex: 1,
    backgroundColor: 'rgb(255, 255, 255)',
    paddingVertical: 9,
    borderRadius: 12,
    alignItems: 'center',
  },
  inactiveTab: { flex: 1, paddingVertical: 9, alignItems: 'center' },
  activeText: { fontFamily: 'Montserrat_700Bold', fontSize: 13, color: 'rgb(17, 24, 39)' },
  inactiveText: { color: 'rgb(107, 114, 128)', fontSize: 13, fontFamily: 'Montserrat_600SemiBold' },
  scrollContent: {
    flexGrow: 1,
    alignItems: 'center',
    paddingBottom: 24,
    paddingHorizontal: 12,
  },
  card: { borderRadius: 20, padding: 20, paddingTop: 8, paddingBottom: 24, width: '100%', maxWidth: 420 },
  label: { marginTop: 8, marginBottom: 4, fontSize: 13, color: 'rgb(55, 65, 81)', fontFamily: 'Montserrat_600SemiBold' },
  input: {
    borderWidth: 1,
    borderColor: 'rgb(209, 213, 219)',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    fontSize: 14,
    marginBottom: 8,
    backgroundColor: 'rgb(249, 250, 251)',
  },
  inputFocused: { borderColor: 'rgb(109, 170, 26)', borderWidth: 1.5 },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgb(209, 213, 219)',
    borderRadius: 12,
    paddingHorizontal: 12,
    backgroundColor: 'rgb(249, 250, 251)',
    marginBottom: 8,
  },
  passwordInput: { flex: 1, paddingVertical: 10, fontSize: 14 },
  bottomPrompt: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 18 },
  bottomPromptText: { color: 'rgb(55, 65, 81)', fontSize: 13 },
  bottomPromptLink: { color: 'rgb(67, 113, 5)', fontSize: 13, fontWeight: '700' },
  button: {
    backgroundColor: 'rgb(109, 170, 26)',
    padding: 14,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 14,
    shadowColor: 'rgb(109, 170, 26)',
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  errorText: { color: 'rgb(185, 28, 28)', fontSize: 13, fontWeight: '600', textAlign: 'center', marginTop: 8 },
  buttonText: { color: 'rgb(255, 255, 255)', fontSize: 15, fontFamily: 'Montserrat_700Bold' },
})
