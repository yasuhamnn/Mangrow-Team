import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { supabase } from '../../supabaseClient'; // ← Mangrow path

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export async function registerForPushNotificationsAsync(userId) {
  if (!Device.isDevice) {
    console.log('Push notifications require a physical device');
    return;
  }

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
    });
  }

  const { status: existing } = await Notifications.getPermissionsAsync();
  let finalStatus = existing;
  if (existing !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  if (finalStatus !== 'granted') return;

  const projectId =
    Constants.expoConfig?.extra?.eas?.projectId ??
    Constants.easConfig?.projectId;

  if (!projectId) throw new Error('Missing EAS projectId');

  try {
    const tokenResult = await Notifications.getExpoPushTokenAsync({ projectId });
    const pushToken = tokenResult.data;

    const { error } = await supabase.rpc('register_push_token', {
      p_push_token: pushToken,
    });

    if (error) {
      console.error('Error saving push token:', error.message, error);
      return;
    }

    return pushToken;
  } catch (err) {
    console.warn('Failed to get push token:', err.message);
  }
}