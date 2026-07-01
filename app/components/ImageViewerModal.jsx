import React from 'react'
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Image,
  Modal,
  Dimensions,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

const SCREEN_WIDTH = Dimensions.get('window').width

function ViewerIconButton({ name, onPress, disabled, style }) {
  return (
    <TouchableOpacity
      style={[styles.iconButton, disabled && styles.iconButtonDisabled, style]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.85}
    >
      <Ionicons
        name={name}
        size={18}
        color={disabled ? 'rgba(255,255,255,0.35)' : 'rgb(255, 255, 255)'}
      />
    </TouchableOpacity>
  )
}

export default function ImageViewerModal({
  visible,
  images = [],
  index = 0,
  onClose,
  onIndexChange,
}) {
  const insets = useSafeAreaInsets()

  if (!images.length) return null

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.topBar, { top: insets.top + 12 }]}>
          <ViewerIconButton name="arrow-back" onPress={onClose} />
        </View>

        <Image
          source={{ uri: images[index] }}
          style={styles.image}
          resizeMode="cover"
        />

        <View style={styles.nav}>
          <ViewerIconButton
            name="chevron-back"
            onPress={() => onIndexChange(Math.max(index - 1, 0))}
            disabled={index === 0}
          />
          <Text style={styles.counter}>{index + 1} / {images.length}</Text>
          <ViewerIconButton
            name="chevron-forward"
            onPress={() => onIndexChange(Math.min(index + 1, images.length - 1))}
            disabled={index === images.length - 1}
          />
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  topBar: {
    position: 'absolute',
    left: 16,
    zIndex: 2,
  },
  image: {
    width: SCREEN_WIDTH,
    height: SCREEN_WIDTH,
  },
  nav: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 24,
    marginTop: 20,
  },
  counter: {
    color: 'rgb(255, 255, 255)',
    fontFamily: 'Montserrat_600SemiBold',
    fontSize: 14,
  },
  iconButton: {
    width: 30,
    height: 30,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconButtonDisabled: {
    opacity: 0.5,
  },
})
