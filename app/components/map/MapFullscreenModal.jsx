import React from 'react'
import { StyleSheet, View, Text, TouchableOpacity, Modal } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Feather } from '@expo/vector-icons'
import MapPanel from './MapPanel'

export default function MapFullscreenModal({
  visible,
  onClose,
  legendBottom,
  mapPanelProps,
  webViewRef,
}) {
  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.container} edges={['top', 'left', 'right', 'bottom']}>
        <View style={styles.header}>
          <Text style={styles.title}>Map</Text>
          <TouchableOpacity
            style={styles.closeBtn}
            onPress={onClose}
            activeOpacity={0.85}
          >
            <Feather name="x" size={18} color="rgb(16, 32, 15)" />
          </TouchableOpacity>
        </View>
        <View style={styles.mapWrap}>
          <MapPanel
            {...mapPanelProps}
            isFullscreen
            interactive
            legendBottom={legendBottom}
            webViewRef={webViewRef}
          />
        </View>
      </SafeAreaView>
    </Modal>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'rgb(251, 252, 247)',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgb(232, 236, 221)',
  },
  title: {
    fontSize: 18,
    fontFamily: 'Montserrat_700Bold',
    color: 'rgb(16, 32, 15)',
  },
  closeBtn: {
    width: 30,
    height: 30,
    borderRadius: 10,
    backgroundColor: 'rgb(239, 245, 232)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mapWrap: {
    flex: 1,
    padding: 12,
  },
})
