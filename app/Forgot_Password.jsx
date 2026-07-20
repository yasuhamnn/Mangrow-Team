import { Link } from 'expo-router'
import React, { useCallback, useRef, useState } from 'react'
import {
  Alert,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import AuthBackground from './components/AuthBackground'
import LoadingOverlay from './components/LoadingOverlay'
import { resetPassword } from './utils/passwordService'

const { width } = Dimensions.get('window')

const Forgot_Password = () => {
  const [emailFocused, setEmailFocused] = useState(false)
  const [email, setEmail] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  const scrollRef = useRef(null)
  const emailRef = useRef(null)
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

  const handleResetPassword = async () => {
    const trimmedEmail = email.trim()
    if (!trimmedEmail) {
      setErrorMessage('Enter the email address for your account.')
      return
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(trimmedEmail)) {
      setErrorMessage('Please enter a valid email address.')
      return
    }

    setErrorMessage('')
    setIsSending(true)

    try {
      await resetPassword(trimmedEmail)
      Alert.alert('Check your inbox', 'A password reset link has been sent.')
      setEmail('')
    } catch (error) {
      setErrorMessage(error.message)
    } finally {
      setIsSending(false)
    }
  }

  return (
    <AuthBackground style={styles.container}>
      <LoadingOverlay visible={isSending} />

      <View style={styles.fixedTop}>
        <Text style={styles.title}>Welcome to Mangrow</Text>
        <Text style={styles.subtitle}>Monitor mangroves, protect coastlines</Text>
      </View>

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
                returnKeyType="go"
                editable={!isSending}
                placeholderTextColor="rgb(122, 133, 147)"
                value={email}
                onChangeText={setEmail}
                onFocus={() => {
                  setEmailFocused(true)
                  scrollToField('email')
                }}
                onBlur={() => setEmailFocused(false)}
                onSubmitEditing={handleResetPassword}
              />
            </View>

            <View style={styles.inlinePrompt}>
              <Text style={styles.bottomPromptText}>Remember your password?</Text>
              <Link href="/Sign_In" asChild>
                <TouchableOpacity delayPressIn={0}><Text style={styles.backLinkText}> Sign In</Text></TouchableOpacity>
              </Link>
            </View>

            <TouchableOpacity
              style={[styles.button, isSending && styles.buttonDisabled]}
              onPress={handleResetPassword}
              delayPressIn={0}
              disabled={isSending}
            >
              <Text style={styles.buttonText}>Send Link →</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </AuthBackground>
  )
}

export default Forgot_Password

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'rgba(255, 255, 255, 0.69)' },
  flex: { flex: 1 },
  fixedTop: {
    alignItems: 'center',
    paddingTop: 110,
    paddingHorizontal: 28,
    paddingBottom: 4,
  },
  title: {
    fontSize: width * 0.055,
    fontFamily: 'Montserrat_700Bold',
    color: 'rgb(17, 24, 39)',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: width * 0.032,
    color: 'rgb(107, 114, 128)',
    marginTop: 2,
    marginBottom: 8,
    textAlign: 'center',
  },
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
  inlinePrompt: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 18 },
  bottomPromptText: { color: 'rgb(55, 65, 81)', fontSize: 13 },
  errorText: { color: 'rgb(185, 28, 28)', fontSize: 13, fontWeight: '600', textAlign: 'center', marginBottom: 8 },
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
  buttonDisabled: { opacity: 0.7 },
  buttonText: { color: 'rgb(255, 255, 255)', fontFamily: 'Montserrat_700Bold', fontSize: 15 },
  backLinkText: { color: 'rgb(67, 113, 5)', fontSize: 13, fontWeight: '700' },
})
