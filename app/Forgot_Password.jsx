import { Link } from 'expo-router'
import React, { useState } from 'react'
import {
    Alert,
    Dimensions,
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
    const [email, setEmail] = useState('')
    const [isSending, setIsSending] = useState(false)
    const [errorMessage, setErrorMessage] = useState('')
  
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
        <Text style={styles.title}>Welcome to Mangrow</Text>
        <Text style={styles.subtitle}>Monitor mangroves, protect coastlines</Text>
  
        <View style={styles.card}>
          {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}
  
          <Text style={styles.label}>Email Address</Text>
          <TextInput
            placeholder="you@example.com"
            style={styles.input}
            keyboardType="email-address"
            autoCapitalize="none"
            placeholderTextColor="rgb(122, 133, 147)"
            value={email}
            onChangeText={setEmail}
          />
  
          <View style={styles.inlinePrompt}>
            <Text style={styles.bottomPromptText}>Remember your password?</Text>
            <Link href="/Sign_In" asChild>
              <TouchableOpacity delayPressIn={0}><Text style={styles.backLinkText}> Sign In</Text></TouchableOpacity>
            </Link>
          </View>
  
          <TouchableOpacity
            style={[styles.button, isSending && styles.buttonDisabled]}
            onPress={handleResetPassword} delayPressIn={0}
            disabled={isSending}
          >
            <Text style={styles.buttonText}>Send Link →</Text>
          </TouchableOpacity>
        </View>
      </AuthBackground>
    )
  }
  
  export default Forgot_Password
  
  const styles = StyleSheet.create({
    container: { flex: 1, alignItems: 'center', paddingTop: 150, backgroundColor: 'rgba(255, 255, 255, 0.69)' },
    title: { fontSize: width * 0.06, fontFamily: 'Montserrat_700Bold', color: 'rgb(17, 24, 39)', textAlign: 'center' },
    subtitle: { fontSize: width * 0.035, color: 'rgb(107, 114, 128)', marginBottom: 10, textAlign: 'center' },
    card: { borderRadius: 20, padding: 20, paddingBottom: 28, width: '90%' },
    label: { marginTop: 10, marginBottom: 5, fontSize: 14, color: 'rgb(55, 65, 81)', fontFamily: 'Montserrat_600SemiBold' },
    input: { borderWidth: 1, borderColor: 'rgb(209, 213, 219)', borderRadius: 12, padding: 12, marginBottom: 10, backgroundColor: 'rgb(249, 250, 251)' },
    inlinePrompt: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 35 },
    bottomPromptText: { color: 'rgb(55, 65, 81)', fontSize: 14 },
    errorText: { color: 'rgb(185, 28, 28)', fontSize: 14, fontWeight: '600', textAlign: 'center', marginBottom: 10 },
    button: { backgroundColor: 'rgb(109, 170, 26)', padding: 15, borderRadius: 15, alignItems: 'center', marginTop: 20 },
    buttonDisabled: { opacity: 0.7 },
    buttonText: { color: 'rgb(255, 255, 255)', fontFamily: 'Montserrat_700Bold', fontSize: 16 },
    backLinkText: { color: 'rgb(67, 113, 5)', fontSize: 14, fontWeight: '700' },
  })