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
  import { loginUser } from './utils/authService'
  import { getUserRole } from './utils/userService'
  import AuthBackground from './components/AuthBackground'
  import LoadingOverlay from './components/LoadingOverlay'
  
  const { width } = Dimensions.get('window')
  
  const Sign_In = () => {
    const [showPassword, setShowPassword] = useState(false)
    const [emailFocused, setEmailFocused] = useState(false)
    const [passwordFocused, setPasswordFocused] = useState(false)
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [errorMessage, setErrorMessage] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const router = useRouter()
  
    const handleLogin = async () => {
      setErrorMessage('')
      setIsLoading(true)
    
      try {
        const user = await loginUser(email.trim(), password)
        const role = await getUserRole(user.id)
  
        if (role === 'admin') {
          router.replace('/admin/admin_dashboard')
        } else {
          router.replace('/dashboard')
        }
      } catch (error) {
        setErrorMessage(error.message || 'Unable to sign in.')
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
            <TouchableOpacity style={styles.activeTab}>
              <Text style={styles.activeText}>Sign In</Text>
            </TouchableOpacity>
            <Link href="/Create_Account" asChild>
              <TouchableOpacity style={styles.inactiveTab}>
                <Text style={styles.inactiveText}>Create Account</Text>
              </TouchableOpacity>
            </Link>
          </View>
  
          {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}
  
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
              placeholder="Enter your password"
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
  
          <Link href="/Forgot_Password" asChild>
            <TouchableOpacity style={styles.forgotLink}>
              <Text style={styles.forgotLinkText}>Forgot password?</Text>
            </TouchableOpacity>
          </Link>
  
          <View style={styles.bottomPrompt}>
            <Text style={styles.bottomPromptText}>Don't have an account? </Text>
            <Link href="/Create_Account" asChild>
              <TouchableOpacity><Text style={styles.bottomPromptLink}>Create Account</Text></TouchableOpacity>
            </Link>
          </View>
  
          <TouchableOpacity style={styles.button} onPress={handleLogin}>
            <Text style={styles.buttonText}>Sign In →</Text>
          </TouchableOpacity>
        </View>
      </AuthBackground>
    )
  }
  
  export default Sign_In
  
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
    forgotLink: { alignItems: 'center', marginTop: 8 },
    forgotLinkText: { color: 'rgb(67, 113, 5)', fontWeight: '700' },
    bottomPrompt: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 40 },
    bottomPromptText: { color: 'rgb(55, 65, 81)', fontSize: 14 },
    bottomPromptLink: { color: 'rgb(67, 113, 5)', fontSize: 14, fontWeight: '700' },
    button: { backgroundColor: 'rgb(109, 170, 26)', padding: 15, borderRadius: 15, alignItems: 'center', marginTop: 20 },
    errorText: { color: 'rgb(185, 28, 28)', fontSize: 14, fontWeight: '600', textAlign: 'center', marginTop: 12 },
    buttonText: { color: 'rgb(255, 255, 255)', fontSize: 16, fontFamily: 'Montserrat_700Bold' },
  })