import NetInfo from '@react-native-community/netinfo'

/**
 * Returns true when the device appears to have usable internet.
 */
export async function isNetworkAvailable() {
  const state = await NetInfo.fetch()
  if (state.isConnected === false) return false
  if (state.isInternetReachable === false) return false
  return true
}

/**
 * Throws a user-friendly error when offline or unreachable.
 */
export async function assertNetworkAvailable() {
  const online = await isNetworkAvailable()
  if (!online) {
    throw new Error(
      'No internet connection. Please check your Wi‑Fi or mobile data and try again.'
    )
  }
}

/**
 * Maps fetch / Supabase errors to clearer submission messages.
 */
export function toSubmissionErrorMessage(error) {
  const message = error?.message || String(error || '')

  if (/network request failed|failed to fetch|network error/i.test(message)) {
    return 'Connection lost while submitting. Check your internet and try again.'
  }
  if (/timeout|timed out/i.test(message)) {
    return 'Upload is taking too long. Try again on a stronger connection.'
  }
  if (/storage/i.test(message) && /upload/i.test(message)) {
    return 'Photo upload failed. Check your connection and try again.'
  }

  return message || 'Submission failed. Please try again.'
}
