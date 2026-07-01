import { supabase } from '../../supabaseClient'
import * as Linking from 'expo-linking'
import { Platform } from 'react-native'

export const resetPassword = async (email) => {
  // Automatically generate a redirect URL based on the platform and environment
  // Linking.createURL is more robust for Expo dev servers
  const redirectTo = Platform.OS === 'web' 
    ? window.location.origin + '/change_password' 
    : Linking.createURL('/change_password');

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo,
  })

  if (error) throw error
  return true
}

export const updateUserPassword = async (currentPassword, newPassword) => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("No user session found");

  // Re-authenticate by signing in again to verify the current password
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: currentPassword,
  });

  if (signInError) {
    throw signInError;
  }

  // Update to the new password
  const { error: updateError } = await supabase.auth.updateUser({
    password: newPassword,
  });

  if (updateError) throw updateError;
};