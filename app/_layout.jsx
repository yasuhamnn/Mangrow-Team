import {
  Montserrat_400Regular,
  Montserrat_600SemiBold,
  Montserrat_700Bold,
  useFonts,
} from '@expo-google-fonts/montserrat'
import * as Notifications from 'expo-notifications'
import { Stack, useRouter } from 'expo-router'
import { useEffect, useRef, useState } from 'react'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { supabase } from '../supabaseClient'
import {
  handleColdStartNotification,
  handleNotificationResponse,
} from './utils/pushNotificationNavigation'
import { registerForPushNotificationsAsync } from './utils/pushNotifications'

export default function RootLayout() {
  const router = useRouter()
  const [fontsLoaded] = useFonts({
    Montserrat_400Regular,
    Montserrat_600SemiBold,
    Montserrat_700Bold,
  })
  const [session, setSession] = useState(null)

  const notificationListener = useRef(null)
  const responseListener = useRef(null)
  const handledColdStart = useRef(false)

  // Request notification permission immediately on app open
  useEffect(() => {
    Notifications.requestPermissionsAsync()
  }, [])

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session)
    })

    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (session?.user?.id) {
      registerForPushNotificationsAsync(session.user.id);
    }
  }, [session?.user?.id]);

  useEffect(() => {

    notificationListener.current = Notifications.addNotificationReceivedListener(() => {})

    responseListener.current = Notifications.addNotificationResponseReceivedListener((response) => {
      handleNotificationResponse(router, response)
    })

    if (!handledColdStart.current) {
      handledColdStart.current = true
      handleColdStartNotification(router)
    }

    return () => {
      if (notificationListener.current) {
        Notifications.removeNotificationSubscription(notificationListener.current);
      }
      if (responseListener.current) {
        Notifications.removeNotificationSubscription(responseListener.current);
      }
    }
  }, [router])

  if (!fontsLoaded) return null

  return (
    <SafeAreaProvider>
      <Stack
        screenOptions={{
          headerShown: false,
          animation: 'fade',
          animationDuration: 200,
        }}
      >
      <Stack.Screen name="index" />
      <Stack.Screen name="Sign_In" />
      <Stack.Screen name="Create_Account" />
      <Stack.Screen name="Forgot_Password" />
      <Stack.Screen name="dashboard" />
      <Stack.Screen name="camera" />
      <Stack.Screen name="map" />
      <Stack.Screen name="admin/admin_dashboard" />
      <Stack.Screen name="admin/admin_notification" />
      <Stack.Screen name="admin/admin_map" />
      <Stack.Screen name="admin/admin_verify" />
      <Stack.Screen name="admin/admin_reject_report" />
      <Stack.Screen name="admin/admin_reject_resolution" />
      <Stack.Screen name="admin/admin_resolution_compare" />
      <Stack.Screen name="admin/admin_profile" />
      <Stack.Screen name="admin/admin_edit_profile" />
      <Stack.Screen name="admin/admin_change_password" />
      <Stack.Screen name="species_with_gps_coordinates_result" />
      <Stack.Screen name="report_details" />
      <Stack.Screen name="report_resolution_track" />
      <Stack.Screen name="report_resolution_submit" />
      <Stack.Screen name="report_rejection_feedback" />
      <Stack.Screen name="resolution_rejection_feedback" />
      <Stack.Screen name="health_camera" />
      <Stack.Screen name="health_results" />
      <Stack.Screen name="notification" />
      <Stack.Screen name="profile" />
      <Stack.Screen name="edit_profile" />
      <Stack.Screen name="change_password" />
      <Stack.Screen name="search" />
      <Stack.Screen name="settings" />
      </Stack>
    </SafeAreaProvider>
  )
}
