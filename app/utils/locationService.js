import * as Location from 'expo-location'
import { formatLocationAddress } from './shared/locationFormat'

export async function getCurrentLocationWithAddress() {
  const { status } = await Location.requestForegroundPermissionsAsync()
  if (status !== 'granted') {
    throw new Error('Permission to access location was denied')
  }

  const location = await Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.Highest,
  })

  const [address] = await Location.reverseGeocodeAsync({
    latitude: location.coords.latitude,
    longitude: location.coords.longitude,
  })

  return {
    latitude: location.coords.latitude,
    longitude: location.coords.longitude,
    street: address?.street ?? '',
    purok: address?.name ?? '',
    barangay: address?.district ?? '',
    city: address?.city ?? '',
    province: address?.subregion ?? '',
    region: address?.region ?? '',
    country: address?.country ?? '',
    postalCode: address?.postalCode ?? '',
    formattedAddress: formatLocationAddress({
      purok: address?.name,
      street: address?.street,
      barangay: address?.district,
      city: address?.city,
      subregion: address?.subregion,
    }),
  }
}

export async function reverseGeocodeToArea(latitude, longitude) {
  const [address] = await Location.reverseGeocodeAsync({ latitude, longitude })
  if (!address) return 'Unknown Area'
  return [address.district, address.city].filter(Boolean).join(', ')
}